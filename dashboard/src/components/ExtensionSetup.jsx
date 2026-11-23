import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Copy, Check, Download,
  FolderOpen, Pin, Puzzle, RefreshCw, Settings2, ToggleRight, Wrench,
} from 'lucide-react';
import clsx from 'clsx';
import { getSavedExtensionConfig, pingExtension } from '../lib/extensionConnector';

function CopyText({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: the text is visible to copy by hand */ }
  };
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <code className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-mono text-black">{text}</code>
      <button onClick={copy} title="Copy" className="p-1 rounded-md text-gray-500 hover:text-black hover:bg-gray-100 cursor-pointer">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

const STEPS = [
  {
    icon: Download,
    title: 'Download and unzip',
    body: () => (
      <>
        Download the zip above and unzip it. You get a folder called <b>germin8-extension</b>.
        Move it somewhere permanent, such as <i>Documents</i>: Chrome runs the extension from this folder, so don't delete or move it later.
      </>
    ),
  },
  {
    icon: Settings2,
    title: 'Open the Extensions page',
    body: () => (
      <>
        In Chrome (Edge and Brave work too), paste this into the address bar and press Enter: <CopyText text="chrome://extensions" />
      </>
    ),
  },
  {
    icon: ToggleRight,
    title: 'Turn on Developer mode',
    body: () => <>Switch on <b>Developer mode</b> in the top-right corner of the Extensions page.</>,
  },
  {
    icon: FolderOpen,
    title: 'Load the folder',
    body: () => (
      <>
        Click <b>Load unpacked</b> and choose the <b>germin8-extension</b> folder (the one that contains <code className="font-mono text-[11px]">manifest.json</code>).
        A "Germin8" card appears.
      </>
    ),
  },
  {
    icon: Pin,
    title: 'Pin it and open the side panel',
    body: () => (
      <>
        Click the puzzle-piece icon in Chrome's toolbar and pin <b>Germin8</b>. Clicking the Germin8 icon opens its side panel, which stays open while you work on the MCA portal.
      </>
    ),
  },
  {
    icon: CheckCircle2,
    title: 'Check it is connected',
    body: () => (
      <>
        With the dashboard backend running, the side panel's <b>Jobs from dashboard</b> card shows <b>Connected</b>.
        Data you push from <b>AI Scanner → Push to Extension</b> appears there within a few seconds: click <b>Load</b>, open the form on mca.gov.in, then fill.
        The extension never clicks Submit; you review and submit on MCA yourself.
      </>
    ),
  },
];

const TROUBLE = [
  {
    q: 'Chrome says "Manifest file is missing or unreadable"',
    a: 'You picked the wrong folder. Choose the inner germin8-extension folder, the one that directly contains manifest.json.',
  },
  {
    q: 'Chrome shows "Disable developer mode extensions" when it starts',
    a: 'This is normal for extensions loaded from a folder. Close the message (don\'t click Disable).',
  },
  {
    q: 'The side panel says "Backend offline"',
    a: 'The Germin8 backend is not running on this computer. Start it with: node backend/server.js (it listens on http://localhost:4000).',
  },
  {
    q: 'Pushed data does not show up in the side panel',
    a: 'Reload the extension (↻ on its card in chrome://extensions) after installing a new version, then reopen the side panel. Version 1.5.8 added the permissions that let it check the dashboard for jobs.',
  },
  {
    q: '"Push to Extension" says the Extension ID is not set',
    a: 'Pushes still reach the extension through the job queue. To also send directly, copy the ID shown on the Germin8 card in chrome://extensions and paste it in MCA Forms Hub → More → Extension connector.',
  },
];

function fmtSize(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function ExtensionSetup() {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState(false);
  const [status, setStatus] = useState({ state: 'idle' });
  const [openQ, setOpenQ] = useState(null);

  useEffect(() => {
    fetch('/downloads/extension.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setInfo)
      .catch(() => setInfoError(true));
  }, []);

  const checkInstalled = async () => {
    const { extId } = getSavedExtensionConfig();
    if (!extId) { setStatus({ state: 'noid' }); return; }
    setStatus({ state: 'checking' });
    const res = await pingExtension();
    setStatus(res.connected ? { state: 'ok', version: res.version } : { state: 'fail', error: res.error });
  };

  const outdated = status.state === 'ok' && info && status.version && status.version !== info.version;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-3xl">
      {/* Download */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0">
            <Puzzle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h2 className="hero-headline text-base text-black">Germin8 Chrome Extension</h2>
            <p className="text-xs text-gray-500 mt-1">
              Fills MCA forms on mca.gov.in with the data you prepare here. Install it once per computer.
            </p>
            {info && (
              <p className="text-[11px] text-gray-500 mt-2 font-mono">
                Version {info.version} · {fmtSize(info.bytes)} · built {new Date(info.builtAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          {info ? (
            <a href={`/${info.file}`} download={`germin8-extension-v${info.version}.zip`}
              className="px-5 py-2.5 rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold inline-flex items-center gap-2 shrink-0">
              <Download className="w-4 h-4" /> Download extension (.zip)
            </a>
          ) : infoError ? (
            <p className="text-xs text-red-600 max-w-xs">
              The extension package hasn't been built yet. Run <code className="font-mono">npm run build:extension</code> in the dashboard folder.
            </p>
          ) : null}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap text-xs">
          <button onClick={checkInstalled} disabled={status.state === 'checking'}
            className="px-4 py-2 rounded-full border border-gray-300 font-semibold text-black hover:bg-gray-100 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={clsx('w-3.5 h-3.5', status.state === 'checking' && 'animate-spin')} /> Check if it's installed
          </button>
          {status.state === 'ok' && !outdated && <span className="text-emerald-700 font-medium">Installed and responding (v{status.version}).</span>}
          {outdated && <span className="text-amber-700 font-medium">Installed v{status.version}; v{info.version} is available. See "Updating" below.</span>}
          {status.state === 'fail' && <span className="text-red-600">{status.error}</span>}
          {status.state === 'noid' && (
            <span className="text-gray-600">
              To check from here, paste the Extension ID in{' '}
              <button onClick={() => navigate('/dashboard/user/forms?mode=connector')} className="underline font-semibold text-black cursor-pointer">Extension connector</button>.
              Otherwise, open the side panel and look for "Connected".
            </span>
          )}
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="hero-headline text-sm text-black">Install in 6 steps</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">About 2 minutes. You only do this once per computer.</p>
        </div>
        <ol className="divide-y divide-gray-100">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="px-6 py-4 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-black flex items-center gap-2"><Icon className="w-4 h-4 text-gray-500" /> {s.title}</p>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{s.body()}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Updating */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <h2 className="hero-headline text-sm text-black flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Updating to a new version</h2>
        <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs text-gray-600">
          <li>Download the new zip from this page and unzip it.</li>
          <li>Replace the contents of your existing <b>germin8-extension</b> folder with the new files.</li>
          <li>In <CopyText text="chrome://extensions" />, click the reload button (↻) on the Germin8 card, then reopen the side panel.</li>
        </ol>
        <p className="text-[11px] text-gray-500 mt-2">Client data you loaded into the extension stays in Chrome; it is not stored in the folder.</p>
      </section>

      {/* Troubleshooting */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="hero-headline text-sm text-black flex items-center gap-2"><Wrench className="w-4 h-4" /> Troubleshooting</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {TROUBLE.map((t, i) => (
            <div key={t.q}>
              <button onClick={() => setOpenQ(openQ === i ? null : i)}
                className="w-full px-6 py-3 flex items-center gap-2 text-left hover:bg-gray-50 cursor-pointer">
                {openQ === i ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <span className="text-xs font-semibold text-black flex-1">{t.q}</span>
              </button>
              {openQ === i && <p className="px-12 pb-3 text-xs text-gray-600 leading-relaxed">{t.a}</p>}
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        The download contains the extension only. No client data is included; each person's data comes from this dashboard.
      </p>
    </motion.div>
  );
}
