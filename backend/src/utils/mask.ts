// UTILITARIOS PARA REDUZIR EXPOSICAO DE DADOS SENSIVEIS (URL/HOST)

/**
 * MASCARA UMA URL DE FORMA MAIS RESTRITIVA (MODO "OPÇÃO B").
 *
 * OBJETIVO: NÃO EXPOR IP/DOMÍNIO, PORTA, PATH OU QUERY NA UI.
 *
 * EX:
 *  - https://api.exemplo.com/v1/orders?x=1  -> https://•••
 *  - http://10.0.0.12:3000/health         -> http://•••
 */
export function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // MANTÉM APENAS O PROTOCOLO PARA O USUÁRIO ENTENDER O TIPO DE CONEXÃO
    return `${u.protocol}//•••`;
  } catch {
    // CASO NAO SEJA UMA URL VALIDA, AINDA ASSIM NAO EXIBE O VALOR INTEIRO
    if (!raw) return "•••";
    // MOSTRA SÓ UM INDÍCIO SEM ENTREGAR O VALOR
    const hint = raw.trim().startsWith("https") ? "https" : raw.trim().startsWith("http") ? "http" : "•••";
    return `${hint}://•••`;
  }
}

/**
 * MASCARA UM HOST (DNS/IP), EXIBINDO SOMENTE PREFIXO.
 * EX:
 *  - db-prod.internal -> db-prod•••
 *  - 10.0.0.12 -> 10.0.0•••
 */
export function maskHost(raw: string): string {
  if (!raw) return "•••";
  const trimmed = raw.trim();
  if (trimmed.length <= 6) return "•••";
  return `${trimmed.slice(0, 6)}•••`;
}
