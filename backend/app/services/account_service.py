"""Apagar a conta: o que sai, o que fica e por quê.

Sai tudo que é da pessoa: o perfil, os vídeos (arquivo e registro, inclusive os
editados), as análises,
os lembretes, a conexão com o Manus e o login. Fica o que a lei e a contabilidade
exigem — a linha da compra no Stripe (com o dono anonimizado) e os eventos do
funil, que são contagem, não conteúdo.

É irreversível de propósito: apagar de mentira é pior do que não apagar.
"""

import logging

from app.core.config import get_settings
from app.core.errors import ApiError
from app.services import supabase_service as db

logger = logging.getLogger("publishub")


def delete(user: dict, confirmation: str) -> dict:
    """Apaga a conta depois de conferir que a pessoa digitou o próprio e-mail."""
    email = (user.get("email") or "").strip().lower()
    if confirmation.strip().lower() != email:
        raise ApiError(422, "CONFIRMATION_MISMATCH", "Digite o e-mail da sua conta para confirmar a exclusão.")

    settings = get_settings()
    # 1. os arquivos: o banco cai por FK, o Storage não
    apagados = 0
    for row in db.list_storage_paths(user["id"]):
        for path, bucket in ((row.get("storage_path"), None), (row.get("insights_path"), settings.insights_bucket)):
            if not path:
                continue
            try:
                db.delete_object(path, bucket=bucket)
                apagados += 1
            except db.SupabaseError:
                # um arquivo que não some não pode impedir a conta de ser apagada
                logger.warning("could not delete stored file while deleting account %s", user["id"])
    # os vídeos editados moram na mesma pasta, mas numa tabela própria
    for path in db.list_edit_paths(user["id"]):
        try:
            db.delete_object(path)
            apagados += 1
        except db.SupabaseError:
            logger.warning("could not delete edited video while deleting account %s", user["id"])

    # 2. a conta: o resto das tabelas cai junto por FK
    db.delete_user(user["id"])
    logger.info("account %s deleted (%s stored files removed)", user["id"], apagados)
    return {"deleted": True, "files_removed": apagados}
