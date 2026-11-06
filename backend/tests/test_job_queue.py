"""Num pico (o dia do lançamento), a fila de vídeos não pode travar a API.

As rotas são síncronas e rodam no pool de threads do anyio (40 vagas). Antes,
cada análise esperando a vez segurava uma dessas vagas: com 40 vídeos na fila,
nenhuma rota respondia mais, nem a que mostra o progresso da análise.
"""

import threading

import anyio
from starlette.background import BackgroundTask

from app.services import analysis_service, edit_service

QUEUED = 45  # mais do que as 40 vagas do pool da API


def test_a_long_queue_of_videos_does_not_freeze_the_api(monkeypatch):
    release = threading.Event()
    started = []

    def slow_analysis(analysis_id, ui_language=None):
        with analysis_service._analysis_slots():
            started.append(analysis_id)
            release.wait(30)

    def slow_edit(edit_id):
        with edit_service._slot:
            started.append(edit_id)
            release.wait(30)

    monkeypatch.setattr(analysis_service, "run_analysis", slow_analysis)
    monkeypatch.setattr(edit_service, "run", slow_edit)

    async def main():
        async with anyio.create_task_group() as tg:
            # exatamente o que as rotas agendam (POST /api/videos, POST /edit)
            for i in range(QUEUED):
                tg.start_soon(BackgroundTask(analysis_service.queue_analysis, f"analysis-{i}", None))
                tg.start_soon(BackgroundTask(edit_service.queue, f"edit-{i}"))
            await anyio.sleep(0.5)

            # qualquer rota síncrona (GET /api/analyses/{id}) ainda responde
            with anyio.fail_after(5):
                assert await anyio.to_thread.run_sync(lambda: "ok") == "ok"
            # e a fila anda no ritmo dela: 2 análises e 1 edição por vez
            assert len(started) == 3
            release.set()

    anyio.run(main)
    assert len(started) == QUEUED * 2
