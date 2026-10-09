/* Static terminal diagnostics. Copied as plain text; never executed. */

                                    
                                                    
                                             
                                              
                  
                                                          
                                                             
                                                          
                                                                               
 

export const COMMANDS                      = [
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
