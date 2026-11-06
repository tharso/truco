# Truco do Bar do Zé

## Agent skills

### Issue tracker

As issues ficam no GitHub Issues de tharso/truco (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

As 5 etiquetas padrão: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: um `GLOSSARY.md` e `docs/adr/` na raiz. See `docs/agents/domain.md`.

## Mudanças

Várias sessões usam esta pasta ao mesmo tempo. Mudança de código vai num worktree próprio (`git worktree add ../truco-<assunto> -b <assunto> origin/main`, depois `npm install` lá dentro); a pasta principal fica na `main`. O `.githooks/pre-commit` barra commit em outra branch na pasta principal.

Cada rodada de ajustes decidida com Tharso entra no `PLANO-AJUSTES.md`, com o que mudou e o número da PR ou do commit.

Ver a Mesa com cartas no Tampo: `scripts/cena.sh` (quatro Robôs jogando sozinhos).
