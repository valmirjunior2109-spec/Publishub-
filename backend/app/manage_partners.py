"""Aprova ou remove Partners do Publishub. Roda no seu computador, com o backend/.env (chave service_role).

    python -m app.manage_partners approve creator@email.com
    python -m app.manage_partners revoke creator@email.com
    python -m app.manage_partners list

A pessoa precisa ter criado a conta antes. Aprovar dá o Lifetime grátis e gera o link de indicação;
remover devolve a conta às regras normais de plano. Não há endpoint de administração de propósito.
"""

import argparse
import sys

from app.core.errors import ApiError
from app.services import partners_service, supabase_service as db


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.manage_partners", description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("approve", "revoke"):
        commands.add_parser(name).add_argument("email")
    commands.add_parser("list")
    args = parser.parse_args(argv)

    try:
        if args.command == "approve":
            result = partners_service.approve(args.email)
            print(f"{result['email']} já era Partner." if result["already"] else f"{result['email']} agora é Partner (Lifetime grátis).")
            print(f"Link: /?ref={result['code']}")
        elif args.command == "revoke":
            result = partners_service.revoke(args.email)
            print(f"{result['email']} deixou de ser Partner." if result["changed"] else f"{result['email']} não era Partner.")
        else:
            partners = db.list_partners()
            for p in partners:
                print(f"{p.get('email')}\t{p.get('referral_code') or '-'}\tdesde {str(p.get('partner_since') or '')[:10]}")
            print(f"{len(partners)} Partner(s).")
    except ApiError as exc:
        print(exc.message, file=sys.stderr)
        return 1
    except (db.SupabaseNotConfigured, db.SupabaseError) as exc:
        print(f"Não foi possível falar com o Supabase ({type(exc).__name__}). Confira o backend/.env e se a migração 20260918 rodou.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
