/* Static terminal diagnostics. Copied as plain text; never executed. */

export interface CommandDefinition {
  /** Stable id used by the UI for copy feedback. */
  id: 'endpointProxy' | 'timeLocale' | 'dns';
  /** Exact shell command, copied verbatim. */
  command: string;
  /** Label key resolved through the locale dictionary. */
  titleKey: 'commandEndpoint' | 'commandTime' | 'commandDns';
  /** Label key resolved through the locale dictionary. */
  descriptionKey: 'commandEndpointNote' | 'commandTimeNote' | 'commandDnsNote';
}

export const COMMANDS: CommandDefinition[] = [
  {
    id: 'endpointProxy',
    command: "env | grep -E '^(ANTHROPIC_BASE_URL|HTTPS?_PROXY|ALL_PROXY|NO_PROXY)='",
    titleKey: 'commandEndpoint',
    descriptionKey: 'commandEndpointNote',
  },
  {
    id: 'timeLocale',
    command: 'date; node -e "console.log(Intl.DateTimeFormat().resolvedOptions())"; locale',
    titleKey: 'commandTime',
    descriptionKey: 'commandTimeNote',
  },
  {
    id: 'dns',
    command: 'dig +short api.anthropic.com || nslookup api.anthropic.com',
    titleKey: 'commandDns',
    descriptionKey: 'commandDnsNote',
  },
];
