import fs from 'fs';
import path from 'path';

export function seedSampleLogs(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Create subdirectories to test recursive scanning
  const stealerSubdir = path.join(targetDir, 'stealer_dumps');
  const serverSubdir = path.join(targetDir, 'server_logs');
  const tokensSubdir = path.join(targetDir, 'api_tokens');

  if (!fs.existsSync(stealerSubdir)) fs.mkdirSync(stealerSubdir, { recursive: true });
  if (!fs.existsSync(serverSubdir)) fs.mkdirSync(serverSubdir, { recursive: true });
  if (!fs.existsSync(tokensSubdir)) fs.mkdirSync(tokensSubdir, { recursive: true });

  // 1. stealer_dumps/stealer_combos_2026.txt
  const combos = [
    'https://accounts.google.com/signin:alex.mercer@gmail.com:CyberHunter#2026!',
    'https://github.com/login:dev_lead_sarah:gthb_pr1v4te_K3y!99',
    'https://netflix.com/login:family_streaming@yahoo.com:Movies4Ever_123',
    'https://aws.amazon.com/console:cloud_admin@enterprise.corp:Tr0ub4dor&3_Secure',
    'https://openai.com/auth:ai_researcher@mit.edu:GPT-NeoX*Quantum7',
    'https://binance.com/en/login:crypto_whale88@protonmail.com:BtcToTheMoon$$$2026',
    'https://slack.com/signin:jordan.taylor@techstartup.io:W0rksp4ce_Sl4ck!7',
    'https://jira.atlassian.net/login:project_mgr@corp.internal:AgileSprint#9942',
    'https://paypal.com/signin:merchant_sales@gmail.com:P@yP@l_S3cur3!88',
    'https://login.microsoftonline.com:exec_vp@globalbank.com:AzureCloud#9931!Z',
    'https://okta.company.com/auth:sysadmin@megacorp.com:OktaVault_MasterKey_8',
    'https://gitlab.com/users/sign_in:ops_engineer@gitlab.org:GitOps_K8s_Clust3r',
    'https://discord.com/login:gamer_mod_x@hotmail.com:DiscordNitro2026$',
    'https://spotify.com/login:musiclover99@gmail.com:RockAndRoll_44!',
    'https://chase.com/auth:banking_user1@aol.com:ChaseMoney$$$771',
    'https://coinbase.com/signin:hodl_crypto@gmail.com:Satosh1_N4kamoto!',
    'https://salesforce.com/login:crm_admin@saasfirm.com:SalesForce#2026Key',
    'https://uber.com/login:driver_support@gmail.com:UberDrive#1988',
    'https://appleid.apple.com:steve_fan@icloud.com:iCloud_SecretPass_89!',
    'https://reddit.com/login:karma_farmer99:RedditMod_12345!',
    'https://nordvpn.com/login:secure_tunnel@proton.me:VpnShield_9981#',
    'https://dashlane.com/login:vault_owner@outlook.com:MasterPass_Ultra9901!',
    'https://bitwarden.com/login:sec_officer@infosec.net:Bitwarden#Vault999!',
    'https://digitalocean.com/login:droplet_admin@clouddev.io:DO_Cloud_Server_2026',
    'https://cloudflare.com/login:dns_manager@domainhost.net:Cloudflare_WAF#771'
  ];

  // Generate more realistic combos
  const domains = [
    'accounts.google.com', 'github.com', 'login.microsoftonline.com', 'aws.amazon.com',
    'auth0.openai.com', 'slack.com', 'gitlab.com', 'paypal.com', 'binance.com',
    'app.datadoghq.com', 'grafana.internal.net', 'splunk.enterprise.org', 'idp.okta.com'
  ];
  const users = [
    'admin', 'root', 'support', 'developer', 'qa_lead', 'secops', 'cloud_engineer',
    'sarah.connor', 'john.doe', 'alice.smith', 'bob.martinez', 'david.kim', 'emily.chen'
  ];
  const passSamples = [
    'P@ssw0rd2026!', 'Summer2026#', 'AdminSecret_99', 'qwerty12345', '123456',
    'Complex_Token_8891#Z', 'Hunter2_secure!', 'Autumn$2026', 'RootAccess#001'
  ];

  const generatedCombos = [...combos];
  for (let i = 0; i < 300; i++) {
    const dom = domains[i % domains.length];
    const usr = `${users[i % users.length]}_${i + 10}@${dom.includes('.') ? dom.split('.').slice(-2).join('.') : 'mail.com'}`;
    const pwd = `${passSamples[i % passSamples.length]}_${i * 7}`;
    generatedCombos.push(`https://${dom}/login:${usr}:${pwd}`);
  }

  fs.writeFileSync(
    path.join(stealerSubdir, 'stealer_combos_2026.txt'),
    generatedCombos.join('\n'),
    'utf8'
  );

  // 2. stealer_dumps/redline_stealer_blocks.txt (multi-line format)
  const redlineBlocks = [
    `==================================================
URL: https://login.live.com/login.srf
Username: marcus.wright@outlook.com
Password: Microsoft_Outlook_Pass#992
Application: Google Chrome
==================================================`,
    `==================================================
URL: https://accounts.google.com/ServiceLogin
Username: dev.operations.team@gmail.com
Password: GoogleDev#2026_Key!
Application: Brave Browser
==================================================`,
    `==================================================
URL: https://auth.atlassian.com/login
Username: lead_architect@fintech.co
Password: Atlassian_Cloud_Secret990!
Application: Microsoft Edge
==================================================`,
    `==================================================
URL: https://portal.azure.com/
Username: global_admin@enterprise.onmicrosoft.com
Password: AzureTenant#SuperRoot!2026
Application: Firefox
==================================================`,
    `==================================================
URL: https://dash.cloudflare.com/login
Username: security@edgecdn.net
Password: Cloudflare_DDoS_Shield#123
Application: Google Chrome
==================================================`
  ];

  fs.writeFileSync(
    path.join(stealerSubdir, 'redline_stealer_blocks.txt'),
    redlineBlocks.join('\n\n'),
    'utf8'
  );

  // 3. api_tokens/api_tokens_and_secrets.txt
  const tokensContent = [
    '# API Keys and Leaked Environment Configurations',
    'JWT_BEARER_TOKEN=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SAMPLE_SIGNATURE_DATA',
    'OPENAI_API_KEY=sk-test-SAMPLE_DUMMY_OPENAI_KEY_1234567890abcdef',
    'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'STRIPE_SECRET_KEY=sk_test_SAMPLE_DUMMY_STRIPE_KEY_00000000000000',
    'GITHUB_PERSONAL_ACCESS_TOKEN=ghp_SAMPLE_TEST_TOKEN_00000000000000',
    'SLACK_BOT_TOKEN=xoxb-SAMPLE-TEST-BOT-TOKEN-000000000000',
    'DATABASE_URL=postgres://admin_user:SuperPostgresPass#2026@db.production.internal:5432/main_db',
    '{"service":"AWS S3","apiKey":"AKIAIOSFODNN7EXAMPLE","secret":"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY","region":"us-east-1"}'
  ].join('\n');

  fs.writeFileSync(
    path.join(tokensSubdir, 'api_tokens_and_secrets.txt'),
    tokensContent,
    'utf8'
  );

  // 4. server_logs/auth_syslog.txt
  const syslogLines = [
    '2026-08-24 04:12:01 server-01 sshd[10442]: Failed password for invalid user root from 192.168.1.105 port 44211 ssh2',
    '2026-08-24 04:12:04 server-01 sshd[10445]: Failed password for invalid user admin from 192.168.1.105 port 44214 ssh2',
    '2026-08-24 04:12:08 server-01 sshd[10449]: Accepted password for deployer from 10.0.4.12 port 52190 ssh2',
    '2026-08-24 04:14:22 gateway-02 nginx: 198.51.100.24 - "POST /api/v1/auth/login HTTP/1.1" 401 Authorization: Basic YWRtaW46cGFzc3dvcmQxMjM=',
    '2026-08-24 04:15:33 gateway-02 nginx: 198.51.100.24 - "POST /api/v1/auth/login HTTP/1.1" 200 user=john.doe@corp.com status=SUCCESS',
    '2026-08-24 04:16:01 vpn-gateway ppp0: user:vpn_remote_user1 password:VpnTempPassword#2026 auth_success'
  ].join('\n');

  fs.writeFileSync(
    path.join(serverSubdir, 'auth_syslog.txt'),
    syslogLines,
    'utf8'
  );

  // 5. massive_combo_dataset.txt (stress-test 25,000+ lines for sub-second ripgrep demonstration)
  const massivePath = path.join(targetDir, 'massive_combo_dataset.txt');
  if (!fs.existsSync(massivePath)) {
    const stream = fs.createWriteStream(massivePath, { flags: 'w', encoding: 'utf8' });
    const sampleDomains = ['paypal.com', 'google.com', 'apple.com', 'amazon.com', 'yahoo.com', 'netflix.com', 'facebook.com', 'instagram.com', 'bankofamerica.com', 'wellsfargo.com'];
    
    for (let i = 1; i <= 25000; i++) {
      const d = sampleDomains[i % sampleDomains.length];
      const u = `user_${i}_test@${d}`;
      const p = `P@ssw0rd_${(i * 1337) % 999999}!`;
      stream.write(`https://${d}/auth:${u}:${p}\n`);
    }
    stream.end();
  }

  console.log(`[SampleDataSeeder] Seeded sample log files in ${targetDir}`);
}
