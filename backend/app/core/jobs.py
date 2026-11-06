"""O trabalho pesado (análise, edição de vídeo) fora do pool de threads da API.

Todas as rotas da API são síncronas: o FastAPI roda cada uma no pool de threads
do anyio, que tem 40 vagas. Uma tarefa de fundo síncrona (BackgroundTasks) usa
esse mesmo pool. Antes, cada vídeo enviado ocupava uma vaga esperando a vez na
fila de análises (2 por vez); com 40 vídeos esperando, nenhuma rota respondia
mais, nem a que mostra o progresso da análise. É o que aconteceria num pico de
lançamento.

Aqui cada tipo de trabalho tem a própria fila, com o número certo de threads. A
tarefa de fundo é assíncrona e só espera a vez: esperar não ocupa vaga de ninguém.
"""

import asyncio
import contextvars
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable


class JobQueue:
    """Uma fila com `workers` threads. O resto espera na fila, sem ocupar thread."""

    def __init__(self, name: str, workers: Callable[[], int]):
        self._name = name
        self._workers = workers
        self._pool: ThreadPoolExecutor | None = None
        self._lock = threading.Lock()

    def _executor(self) -> ThreadPoolExecutor:
        with self._lock:
            if self._pool is None:
                self._pool = ThreadPoolExecutor(max_workers=max(1, self._workers()), thread_name_prefix=self._name)
            return self._pool

    async def run(self, fn: Callable, *args) -> None:
        """Roda `fn(*args)` na vez dele. Com o contexto de quem pediu (o id da requisição vai junto para o log)."""
        context = contextvars.copy_context()
        await asyncio.get_running_loop().run_in_executor(self._executor(), context.run, fn, *args)
