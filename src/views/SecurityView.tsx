import React from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Info,
  KeyRound,
  Lock,
  Network,
  RefreshCw,
  Server,
  Shield
} from 'lucide-react';
import {
  SecurityCheckStatus,
  SecurityOverview
} from '../types';

type BadgeStatus = SecurityCheckStatus | SecurityOverview['status'];

interface SecurityViewProps {
  security: SecurityOverview | null;
  onRefresh: () => void;
}

const badgeClasses: Record<BadgeStatus, string> = {
  protected: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  pass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  unknown: 'border-zinc-700 bg-zinc-800/60 text-zinc-400',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-400'
};

const StatusBadge: React.FC<{ status: BadgeStatus }> = ({ status }) => (
  <span className={`inline-flex rounded-md border px-2 py-1 font-mono text-[10px] font-semibold tracking-wide ${badgeClasses[status]}`}>
    {status.toUpperCase()}
  </span>
);

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, children }) => (
  <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
    <div className="mb-4 flex items-start gap-3 border-b border-zinc-800/70 pb-3">
      <div className="rounded-lg bg-zinc-800/80 p-2 text-emerald-400">{icon}</div>
      <div>
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

const ValueRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-zinc-800/50 py-2 last:border-0">
    <span className="text-xs text-zinc-500">{label}</span>
    <span className="text-right font-mono text-xs text-zinc-200">{value}</span>
  </div>
);

const boolValue = (value: boolean | null): string => {
  if (value === null) return 'Unknown';
  return value ? 'Enabled' : 'Disabled';
};

export const SecurityView: React.FC<SecurityViewProps> = ({
  security,
  onRefresh
}) => {
  if (!security) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <Shield className="h-8 w-8 text-zinc-500" />
        <h2 className="font-semibold text-zinc-200">Security data unavailable</h2>
        <p className="max-w-md text-sm text-zinc-500">
          The host security endpoint has not returned data yet. Check the host agent and API connection.
        </p>
        <button
          onClick={onRefresh}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  const bannerClasses =
    security.status === 'protected'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : security.status === 'warning'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      : security.status === 'critical'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      : 'border-zinc-700 bg-zinc-900 text-zinc-300';

  const OverallIcon =
    security.status === 'protected'
      ? CheckCircle2
      : security.status === 'unknown'
      ? Info
      : AlertCircle;

  const checkedAt = Number.isNaN(Date.parse(security.timestamp))
    ? security.timestamp
    : new Date(security.timestamp).toLocaleString();

  return (
    <div className="space-y-6">
      <div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${bannerClasses}`}>
        <div className="flex items-start gap-3">
          <OverallIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Host Security</h2>
              <StatusBadge status={security.status} />
            </div>
            <p className="mt-1 max-w-3xl text-sm opacity-80">{security.summary}</p>
            <p className="mt-2 font-mono text-[10px] opacity-60">Last checked: {checkedAt}</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-current/20 bg-black/10 px-3 py-2 text-xs font-semibold hover:bg-black/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh checks
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Host Firewall · IPv4" subtitle={`Backend: ${security.firewall.backend}`} icon={<Network className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">INPUT chain</span>
            <StatusBadge status={security.firewall.ipv4.status} />
          </div>
          <ValueRow label="Default policy" value={security.firewall.ipv4.defaultPolicy} />
          <ValueRow label="Base chains" value={security.firewall.ipv4.baseChains} />
          <ValueRow label="INPUT rules" value={security.firewall.ipv4.inputRules} />
          <ValueRow label="DROP / REJECT rules" value={security.firewall.ipv4.dropRejectRules} />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{security.firewall.ipv4.details}</p>
        </Panel>

        <Panel title="Host Firewall · IPv6" subtitle="IPv6 input filtering" icon={<Network className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">INPUT chain</span>
            <StatusBadge status={security.firewall.ipv6.status} />
          </div>
          <ValueRow label="Default policy" value={security.firewall.ipv6.defaultPolicy} />
          <ValueRow label="Base chains" value={security.firewall.ipv6.baseChains} />
          <ValueRow label="INPUT rules" value={security.firewall.ipv6.inputRules} />
          <ValueRow label="DROP / REJECT rules" value={security.firewall.ipv6.dropRejectRules} />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{security.firewall.ipv6.details}</p>
        </Panel>

        <Panel title="Fail2ban" subtitle="Authentication and abuse protection" icon={<Ban className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Service and jail status</span>
            <StatusBadge status={security.fail2ban.status} />
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-[10px] text-zinc-500">Service</div>
              <div className={`mt-1 text-sm font-semibold ${security.fail2ban.serviceActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {security.fail2ban.serviceActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-[10px] text-zinc-500">Jails</div>
              <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{security.fail2ban.jailCount}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
              <div className="text-[10px] text-zinc-500">Banned now</div>
              <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{security.fail2ban.currentlyBanned}</div>
            </div>
          </div>
          {security.fail2ban.jails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="pb-2 pr-3">Jail</th>
                    <th className="px-2 pb-2 text-right">Banned</th>
                    <th className="px-2 pb-2 text-right">Failed</th>
                    <th className="pb-2 pl-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {security.fail2ban.jails.map((jail) => (
                    <tr key={jail.name} className="border-t border-zinc-800/60">
                      <td className="py-2 pr-3 font-mono text-zinc-300">{jail.name}</td>
                      <td className="px-2 py-2 text-right font-mono text-zinc-200">{jail.currentlyBanned}</td>
                      <td className="px-2 py-2 text-right font-mono text-zinc-400">{jail.currentlyFailed}</td>
                      <td className="py-2 pl-2 text-right font-mono text-zinc-400">{jail.totalBanned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No jail details available.</p>
          )}
          <p className="mt-3 text-xs text-zinc-500">{security.fail2ban.details}</p>
        </Panel>

        <Panel title="SSH Configuration" subtitle="Values from sshd -T; Match-specific contexts are not evaluated" icon={<KeyRound className="h-4 w-4" />}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Configuration query</span>
            <StatusBadge status={security.ssh.available ? 'pass' : 'unknown'} />
          </div>
          <ValueRow label="PermitRootLogin" value={security.ssh.permitRootLogin ?? 'Unknown'} />
          <ValueRow label="PasswordAuthentication" value={boolValue(security.ssh.passwordAuthentication)} />
          <ValueRow label="PubkeyAuthentication" value={boolValue(security.ssh.pubkeyAuthentication)} />
          <ValueRow label="PermitEmptyPasswords" value={boolValue(security.ssh.permitEmptyPasswords)} />
          <ValueRow label="MaxAuthTries" value={security.ssh.maxAuthTries ?? 'Unknown'} />
          <ValueRow label="X11Forwarding" value={boolValue(security.ssh.x11Forwarding)} />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{security.ssh.details}</p>
        </Panel>

        <Panel title="Host Agent" subtitle="Monitoring API and systemd service properties" icon={<Server className="h-4 w-4" />}>
          <ValueRow label="API access" value={security.agent.apiReadOnly ? 'Fixed GET endpoints' : 'Read-only not confirmed'} />
          <ValueRow label="Service account" value={security.agent.serviceUser} />
          <ValueRow label="NoNewPrivileges" value={boolValue(security.agent.noNewPrivileges)} />
          <ValueRow label="PrivateTmp" value={boolValue(security.agent.privateTmp)} />
          <ValueRow label="ProtectHome" value={boolValue(security.agent.protectHome)} />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">{security.agent.details}</p>
        </Panel>

        <Panel title="Firewall Managers" subtitle="Detected firewall management tools" icon={<Lock className="h-4 w-4" />}>
          <ValueRow label="Detected backend" value={security.firewall.backend || 'Unknown'} />
          <ValueRow label="Managers" value={security.firewall.managers.length ? security.firewall.managers.join(', ') : 'None detected'} />
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Host INPUT filtering is separate from Docker forwarding rules and the hosting provider firewall.
          </p>
        </Panel>
      </div>

      <Panel title="Security Checks" subtitle={`${security.checks.length} checks reported by the host agent`} icon={<Shield className="h-4 w-4" />}>
        <div className="space-y-3">
          {security.checks.map((check) => (
            <div key={check.id} className="flex flex-col gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-200">{check.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{check.details}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                <span className="max-w-48 text-right text-xs text-zinc-300">{check.value}</span>
                <StatusBadge status={check.status} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs leading-relaxed text-sky-200/70">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
        <p>
          This is a read-only baseline assessment. It does not change firewall, SSH or Fail2ban settings. A passing result does not replace a full security audit or verification of the hosting provider firewall.
        </p>
      </div>
    </div>
  );
};
