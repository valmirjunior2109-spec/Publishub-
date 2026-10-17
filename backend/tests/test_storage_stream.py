"""O vídeo vai e volta do Storage pelo disco, em pedaços, nunca inteiro na memória."""

from contextlib import contextmanager

import httpx
import pytest

from app.services import supabase_service


class FakeStream:
    def __init__(self, chunks, status=200):
        self.chunks = chunks
        self.status = status

    def raise_for_status(self):
        if self.status >= 400:
            request = httpx.Request("GET", "https://project.supabase.test")
            raise httpx.HTTPStatusError("erro", request=request, response=httpx.Response(self.status, request=request))

    def iter_bytes(self, size):
        yield from self.chunks


def test_download_to_file_writes_the_chunks_to_disk(env, tmp_path, monkeypatch):
    calls = []

    @contextmanager
    def fake_stream(method, url, headers, timeout):
        calls.append((method, url, headers))
        yield FakeStream([b"abc", b"def"])

    monkeypatch.setattr(supabase_service.httpx, "stream", fake_stream)
    destination = tmp_path / "video.mp4"
    supabase_service.download_to_file("user 1/clip.mp4", destination)

    assert destination.read_bytes() == b"abcdef"
    method, url, headers = calls[0]
    assert method == "GET"
    # o caminho vai codificado, e a pasta continua separada por /
    assert url == "https://project.supabase.test/storage/v1/object/videos/user%201/clip.mp4"
    assert headers["Authorization"] == "Bearer service-role-test"


def test_download_to_file_retries_once_after_a_dropped_connection(env, tmp_path, monkeypatch):
    attempts = []

    @contextmanager
    def flaky_stream(method, url, headers, timeout):
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ReadError("connection dropped")
        yield FakeStream([b"ok"])

    monkeypatch.setattr(supabase_service.httpx, "stream", flaky_stream)
    destination = tmp_path / "video.mp4"
    supabase_service.download_to_file("u/clip.mp4", destination)

    assert len(attempts) == 2
    assert destination.read_bytes() == b"ok"


def test_download_to_file_raises_when_storage_refuses(env, tmp_path, monkeypatch):
    @contextmanager
    def missing(method, url, headers, timeout):
        yield FakeStream([], status=404)

    monkeypatch.setattr(supabase_service.httpx, "stream", missing)
    with pytest.raises(supabase_service.SupabaseError):
        supabase_service.download_to_file("u/none.mp4", tmp_path / "x.mp4")


def test_upload_file_streams_the_file_with_its_size(env, tmp_path, monkeypatch):
    source = tmp_path / "edited.mp4"
    source.write_bytes(b"x" * (supabase_service.STREAM_CHUNK + 10))
    sent = {}

    def fake_post(url, content, headers, timeout):
        sent["url"] = url
        sent["headers"] = headers
        sent["body"] = b"".join(content)
        return httpx.Response(200, request=httpx.Request("POST", url))

    monkeypatch.setattr(supabase_service.httpx, "post", fake_post)
    supabase_service.upload_file("u/edits/out.mp4", source, "video/mp4")

    assert sent["url"] == "https://project.supabase.test/storage/v1/object/videos/u/edits/out.mp4"
    assert sent["body"] == source.read_bytes()
    assert sent["headers"]["Content-Length"] == str(source.stat().st_size)
    assert sent["headers"]["Content-Type"] == "video/mp4"
    assert sent["headers"]["x-upsert"] == "true"
