import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, PlusCircle, PieChart, Wallet, Calendar, 
  CheckCircle, PiggyBank, TrendingUp, Edit2, 
  Save, X, Loader2, Lock, AlertTriangle, AlertCircle, Trash2,
  Zap, ShieldAlert
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

// --- Inicialización de Firebase con tus llaves ---
// Esta lógica detecta si estás aquí en la plataforma web o en tu computadora local (VS Code).
const envConfig = typeof __firebase_config !== 'undefined' && __firebase_config ? JSON.parse(__firebase_config) : null;

const firebaseConfig = envConfig || {
  apiKey: "AIzaSyD3InxOi9-GczeHB7KuPGkJxIiHKwp7wAI",
  authDomain: "mis-deudas-al-dia-a0754.firebaseapp.com",
  projectId: "mis-deudas-al-dia-a0754",
  storageBucket: "mis-deudas-al-dia-a0754.firebasestorage.app",
  messagingSenderId: "612767332474",
  appId: "1:612767332474:web:764c1552f668ba7b9ca3c3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gota-tracker-app';

// --- Utilidades de Fecha ---
const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateStr = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay(); // 0 = Domingo
};

const getEndDate = (startDate, daysToAdd) => {
  let date = new Date(startDate);
  let added = 0;
  if (daysToAdd <= 0) return date;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++; // Saltar domingos
  }
  return date;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
};

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentModalData, setPaymentModalData] = useState(null);

  // 1. Autenticación Segura
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error en autenticación:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch y Lógica "Catch-up" (Auto-Mora)
  useEffect(() => {
    if (!user) return;

    const loansRef = collection(db, 'artifacts', appId, 'users', user.uid, 'loans');
    
    const unsubscribe = onSnapshot(loansRef, async (snapshot) => {
      const todayStr = getLocalTodayString();
      const yesterdayStr = addDaysToDateStr(todayStr, -1);

      // --- Seeder: Cargar datos iniciales si está vacío ---
      if (snapshot.empty) {
        const initialLoans = [
          { prestamista: 'José', capital: 208, interes: 42, deudaTotal: 250, saldoPendiente: 250, cuotaDiaria: 50, montoExigible: 50, fechaInicio: new Date().toISOString(), lastProcessedDate: todayStr, lastManualPaymentDate: null, manualPaymentsCount: 0, pagadoAcumulado: 0 },
          { prestamista: 'Dylan', capital: 216, interes: 44, deudaTotal: 260, saldoPendiente: 260, cuotaDiaria: 20, montoExigible: 20, fechaInicio: new Date().toISOString(), lastProcessedDate: todayStr, lastManualPaymentDate: null, manualPaymentsCount: 0, pagadoAcumulado: 0 },
          { prestamista: 'Joel', capital: 395, interes: 80, deudaTotal: 475, saldoPendiente: 475, cuotaDiaria: 25, montoExigible: 25, fechaInicio: new Date().toISOString(), lastProcessedDate: todayStr, lastManualPaymentDate: null, manualPaymentsCount: 0, pagadoAcumulado: 0 },
          { prestamista: 'Steven', capital: 500, interes: 100, deudaTotal: 600, saldoPendiente: 600, cuotaDiaria: 25, montoExigible: 25, fechaInicio: new Date().toISOString(), lastProcessedDate: todayStr, lastManualPaymentDate: null, manualPaymentsCount: 0, pagadoAcumulado: 0 },
        ];
        
        for (const loan of initialLoans) {
          await addDoc(loansRef, loan);
        }
        return; 
      }

      const fetchedLoans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // --- Catch-up Lógica: Actualizar Mora ---
      for (let loan of fetchedLoans) {
        if (loan.saldoPendiente <= 0) continue;

        let lastProc = loan.lastProcessedDate || yesterdayStr;
        let checkDate = addDaysToDateStr(lastProc, 1);
        let daysToAdd = 0;

        // Sumar mora por cada día pasado que no sea domingo
        while (checkDate <= todayStr) {
          if (getDayOfWeek(checkDate) !== 0) { 
            daysToAdd++;
          }
          checkDate = addDaysToDateStr(checkDate, 1);
        }

        if (daysToAdd > 0) {
          let addExigible = daysToAdd * loan.cuotaDiaria;
          let currentExigible = loan.montoExigible || 0;
          
          try {
            const loanDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'loans', loan.id);
            await updateDoc(loanDoc, {
              montoExigible: currentExigible + addExigible,
              lastProcessedDate: todayStr
            });
          } catch (error) {
            console.error("Error en auto-acumulación:", error);
          }
        }
      }

      setLoans(fetchedLoans);
      setLoadingData(false);
    }, (error) => {
      console.error("Error fetching loans:", error);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Cálculos Globales ---
  const stats = useMemo(() => {
    let totalDeuda = 0, cuotaHoy = 0, totalCapital = 0, totalIntereses = 0;
    let saldoTotal = 0, exigibleTotal = 0;

    loans.forEach(loan => {
      totalDeuda += loan.deudaTotal;
      saldoTotal += loan.saldoPendiente;
      totalCapital += loan.capital;
      totalIntereses += loan.interes;
      
      if (loan.saldoPendiente > 0) {
        cuotaHoy += Math.min(loan.cuotaDiaria, loan.saldoPendiente);
        exigibleTotal += (loan.montoExigible || 0);
      }
    });

    return { totalDeuda, cuotaHoy, totalCapital, totalIntereses, saldoTotal, exigibleTotal };
  }, [loans]);

  // --- Handlers DB ---
  const executePayment = async (loanId, amountPaid) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !user) return;

    const todayStr = getLocalTodayString();
    const isSameDay = loan.lastManualPaymentDate === todayStr;
    const count = isSameDay ? (loan.manualPaymentsCount || 0) : 0;

    const nuevoSaldo = Math.max(0, loan.saldoPendiente - amountPaid);
    const nuevoExigible = Math.max(0, (loan.montoExigible || 0) - amountPaid);
    const nuevoPagado = (loan.pagadoAcumulado || 0) + amountPaid;

    try {
      const loanDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'loans', loan.id);
      await updateDoc(loanDoc, {
        saldoPendiente: nuevoSaldo,
        montoExigible: nuevoExigible,
        pagadoAcumulado: nuevoPagado,
        lastManualPaymentDate: todayStr,
        manualPaymentsCount: count + 1
      });
      setPaymentModalData(null);
    } catch (error) {
      console.error("Error al registrar pago:", error);
    }
  };

  const handleEdit = async (id, nuevoSaldo, nuevaCuota, nuevoExigible) => {
    if (!user) return;
    try {
      const loanDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id);
      await updateDoc(loanDoc, {
        saldoPendiente: parseFloat(nuevoSaldo) || 0,
        cuotaDiaria: parseFloat(nuevaCuota) || 0,
        montoExigible: parseFloat(nuevoExigible) || 0
      });
    } catch (error) {
      console.error("Error al editar:", error);
    }
  };

  const handleAddLoan = async (newLoan) => {
    if (!user) return;
    try {
      const loansRef = collection(db, 'artifacts', appId, 'users', user.uid, 'loans');
      await addDoc(loansRef, newLoan);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Error al agregar:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      const loanDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'loans', id);
      await deleteDoc(loanDoc);
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  if (loadingAuth || loadingData) {
    return (
      <div className="flex justify-center items-center bg-[#050505] min-h-screen font-sans">
        <div className="flex flex-col items-center justify-center space-y-6 relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full"></div>
          <Loader2 className="animate-spin text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" size={64} />
          <p className="text-emerald-400/80 font-bold tracking-[0.2em] uppercase text-sm animate-pulse">Sincronizando Bóveda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-[#030712] min-h-screen font-sans text-slate-200">
      <div className="w-full max-w-md bg-[#050505] min-h-screen shadow-2xl flex flex-col relative overflow-hidden ring-1 ring-white/5">
        
        {/* Fondo Futurista Alucinante */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-emerald-900/30 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-64 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

        {/* Header - Neon Style */}
        <header className="p-6 pb-8 z-10 relative shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              <Zap className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,1)]" size={28} /> 
              GOTA<span className="font-light text-slate-300">TRACKER</span>
            </h1>
            <div className="bg-emerald-950/50 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest border border-emerald-500/30 flex items-center gap-2 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]"></span>
              En Línea
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-wider">Deuda Global</p>
              <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                <span className="text-emerald-500/50 text-2xl mr-1">S/</span>
                {stats.saldoTotal.toFixed(2)}
              </h2>
            </div>
            <div className="text-right">
               <p className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Exigible Hoy</p>
               <h3 className={`text-2xl font-black ${stats.exigibleTotal > stats.cuotaHoy ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]'}`}>
                 <span className="text-sm mr-1 opacity-50">S/</span>
                 {stats.exigibleTotal.toFixed(2)}
               </h3>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-28 relative z-10 scroll-smooth">
          {activeTab === 'dashboard' && <DashboardTab loans={loans} onPayRequest={setPaymentModalData} onEdit={handleEdit} onDelete={handleDelete} />}
          {activeTab === 'add' && <AddLoanTab onAdd={handleAddLoan} />}
          {activeTab === 'insights' && <InsightsTab stats={stats} loans={loans} />}
        </main>

        {/* Bottom Nav - Glassmorphism */}
        <nav className="absolute bottom-6 left-4 right-4 bg-slate-900/80 backdrop-blur-2xl border border-white/10 flex justify-around p-2 rounded-3xl z-20 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <NavItem icon={<Home size={20} />} label="Panel" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<PlusCircle size={20} />} label="Nuevo" isActive={activeTab === 'add'} onClick={() => setActiveTab('add')} />
          <NavItem icon={<PieChart size={20} />} label="Datos" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
        </nav>

        {paymentModalData && (
          <PaymentModal loan={paymentModalData} onClose={() => setPaymentModalData(null)} onSubmit={executePayment} />
        )}
      </div>
    </div>
  );
}

// --- Componentes Secundarios ---

function DashboardTab({ loans, onPayRequest, onEdit, onDelete }) {
  const activeLoans = loans.filter(l => l.saldoPendiente > 0);
  
  return (
    <div className="space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-2 mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Activos ({activeLoans.length})</h3>
      </div>
      <div className="space-y-5">
        {activeLoans.map(loan => (
          <LoanCard key={loan.id} loan={loan} onPayRequest={onPayRequest} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {activeLoans.length === 0 && (
          <div className="text-center p-10 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(52,211,153,0.1)]">
            <CheckCircle className="mx-auto text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" size={48} />
            <p className="text-white font-bold text-lg mb-1 tracking-wide">¡Sistema Limpio!</p>
            <p className="text-slate-500 text-sm">No se detectan deudas activas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanCard({ loan, onPayRequest, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSaldo, setEditSaldo] = useState(loan.saldoPendiente);
  const [editCuota, setEditCuota] = useState(loan.cuotaDiaria);
  const [editExigible, setEditExigible] = useState(loan.montoExigible || 0);

  const cuotasRestantes = Math.ceil(loan.saldoPendiente / loan.cuotaDiaria);
  const fechaFin = getEndDate(new Date(), cuotasRestantes);
  
  const todayStr = getLocalTodayString();
  const yaPagadoHoy = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;
  const exigible = loan.montoExigible || 0;

  // Lógica de Neón y Estados
  let glowColor = "rgba(52,211,153,"; // Emerald base
  let borderColor = "border-emerald-500/30";
  let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusText = "EN LÍNEA";
  let isDanger = false;

  if (exigible > loan.cuotaDiaria) {
    glowColor = "rgba(244,63,94,"; // Rose base
    borderColor = "border-rose-500/50";
    statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse";
    statusText = "MORA CRÍTICA";
    isDanger = true;
  } else if (exigible > 0) {
    glowColor = "rgba(251,191,36,"; // Amber base
    borderColor = "border-amber-400/30";
    statusBadge = "bg-amber-400/10 text-amber-400 border-amber-400/20";
    statusText = "PENDIENTE";
  }

  if (isEditing) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xl p-5 rounded-[28px] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-5">
          <h4 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">AJUSTAR DATOS</h4>
          <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Deuda Restante (S/)</label>
            <input type="number" value={editSaldo} onChange={(e) => setEditSaldo(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Monto Exigible (S/)</label>
            <input type="number" value={editExigible} onChange={(e) => setEditExigible(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Cuota Diaria (S/)</label>
            <input type="number" value={editCuota} onChange={(e) => setEditCuota(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onDelete(loan.id)} className="flex-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-3 rounded-2xl text-xs font-bold flex justify-center items-center gap-2 hover:bg-rose-500/20 transition-all"><Trash2 size={16}/> PURGAR</button>
          <button onClick={() => { onEdit(loan.id, editSaldo, editCuota, editExigible); setIsEditing(false); }} className="flex-1 bg-cyan-500 text-black py-3 rounded-2xl text-xs font-black flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all"><Save size={16} /> CONFIRMAR</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group p-[1px] rounded-[32px] overflow-hidden transition-all duration-500 shadow-[0_10px_30px_-15px_${glowColor}0.3)] hover:shadow-[0_15px_40px_-10px_${glowColor}0.5)]`}>
      {/* Animated Border Gradient Wrapper */}
      <div className={`absolute inset-0 bg-gradient-to-br ${isDanger ? 'from-rose-500 via-rose-900 to-black' : 'from-slate-700 via-slate-800 to-black'} group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      {/* Inner Card (Glassmorphism) */}
      <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl p-5 sm:p-6 rounded-[31px] h-full border border-white/5 flex flex-col justify-between">
        
        {/* Top Row: Title & Badge */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-2xl font-black text-white tracking-tight">{loan.prestamista}</h4>
              <button onClick={() => setIsEditing(true)} className="text-slate-600 hover:text-cyan-400 transition-colors bg-white/5 p-1.5 rounded-full"><Edit2 size={12} /></button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-bold tracking-widest uppercase">
              <Calendar size={12} className="text-slate-400" /> Fin: {formatDate(fechaFin.toISOString())}
            </p>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border flex items-center gap-1.5 shadow-lg ${statusBadge}`}>
            {isDanger && <ShieldAlert size={10} />}
            {statusText}
          </div>
        </div>

        {/* Middle Row: Metrics Display */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Deuda Restante</p>
            <p className="text-lg font-black text-white">S/ {loan.saldoPendiente}</p>
          </div>
          <div className={`bg-black/50 p-4 rounded-2xl border ${isDanger ? 'border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'border-white/5'} shadow-inner relative overflow-hidden`}>
            {isDanger && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/20 blur-xl rounded-full"></div>}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 relative z-10">Exigible</p>
            <p className={`text-xl font-black tracking-tight relative z-10 ${isDanger ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]' : (exigible > 0 ? 'text-amber-400' : 'text-slate-300')}`}>
              S/ {exigible.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Bottom Row: Action */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cuota Diaria</span>
            <span className="font-black text-slate-300 text-lg">S/ {loan.cuotaDiaria}</span>
          </div>
          
          <button onClick={() => onPayRequest(loan)}
            className={`relative inline-flex items-center justify-center px-6 py-3.5 overflow-hidden font-black text-sm rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95
              ${yaPagadoHoy 
                ? 'bg-slate-900 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)]' 
                : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)]'}`}>
            
            {/* Glossy overlay */}
            <span className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none"></span>
            
            <span className="relative z-10 flex items-center gap-2 tracking-wide">
              {yaPagadoHoy ? <><Lock size={16} /> LOCK</> : <><Wallet size={16} /> EJECUTAR</>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ loan, onClose, onSubmit }) {
  const [amount, setAmount] = useState(loan.montoExigible > 0 ? loan.montoExigible : loan.cuotaDiaria);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const todayStr = getLocalTodayString();
  const requiresPassword = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return setError("Monto inválido detectado");
    if (numAmount > loan.saldoPendiente) return setError("Excede deuda máxima");
    if (requiresPassword && password !== 'KGB2026') return setError("ACCESO DENEGADO. Clave incorrecta.");
    
    onSubmit(loan.id, numAmount);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] p-8 pb-12 sm:pb-8 relative overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-400">
        
        {/* Glowing orb background inside modal */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px]"></div>

        <div className="flex justify-between items-center mb-8 relative z-10">
          <h3 className="text-xl font-black text-white tracking-tighter uppercase">
            Transacción: <span className="text-emerald-400">{loan.prestamista}</span>
          </h3>
          <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="space-y-6 mb-8 relative z-10">
          <div>
            <label className="block text-[10px] font-bold text-emerald-400/80 mb-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">Monto a Transferir (S/)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="w-full bg-black border-2 border-emerald-500/30 text-white rounded-3xl px-6 py-5 text-3xl font-black outline-none focus:border-emerald-400 focus:shadow-[0_0_20px_rgba(52,211,153,0.2)] text-center shadow-inner transition-all" />
          </div>

          {requiresPassword && (
            <div className="animate-in slide-in-from-top-4">
              <label className="block text-[10px] font-bold text-rose-400 mb-2 flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]"><Lock size={12} /> Protocolo de Seguridad Requerido (KGB2026):</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black border-2 border-rose-500/40 text-white rounded-3xl px-6 py-5 text-xl text-center tracking-[0.5em] outline-none focus:border-rose-400 focus:shadow-[0_0_20px_rgba(244,63,94,0.3)] shadow-inner transition-all" />
            </div>
          )}
          {error && <p className="text-rose-400 text-xs font-bold text-center uppercase tracking-widest animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]">{error}</p>}
        </div>

        <button onClick={handleSubmit} className="relative w-full overflow-hidden bg-emerald-500 text-black font-black py-5 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] text-lg tracking-widest uppercase transition-all transform hover:scale-[1.02] active:scale-[0.98]">
           <span className="absolute inset-0 bg-white/20 animate-pulse"></span>
           <span className="relative z-10 flex justify-center items-center gap-2">Autorizar Pago <CheckCircle size={20}/></span>
        </button>
      </div>
    </div>
  );
}

function AddLoanTab({ onAdd }) {
  const [prestamista, setPrestamista] = useState('');
  const [capitalStr, setCapitalStr] = useState('');
  const [cuotaStr, setCuotaStr] = useState('');
  const [loading, setLoading] = useState(false);

  const capital = parseFloat(capitalStr) || 0;
  const interes = capital * 0.20;
  const deudaTotal = capital + interes;
  const cuota = parseFloat(cuotaStr) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prestamista || capital <= 0 || cuota <= 0) return;
    setLoading(true);
    
    const newLoan = {
      prestamista, capital, interes, deudaTotal, cuotaDiaria: cuota,
      saldoPendiente: deudaTotal, montoExigible: 0, pagadoAcumulado: 0,
      fechaInicio: new Date().toISOString(),
      lastProcessedDate: getLocalTodayString(),
      lastManualPaymentDate: null, manualPaymentsCount: 0
    };

    await onAdd(newLoan);
    setLoading(false);
  };

  return (
    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8 tracking-tighter uppercase">Generar Contrato</h2>
      
      <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 space-y-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Identificador (Prestamista)</label>
          <input type="text" value={prestamista} onChange={(e) => setPrestamista(e.target.value)} required className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Inyección de Capital (S/)</label>
          <input type="number" value={capitalStr} onChange={(e) => setCapitalStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-emerald-400 rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all text-lg" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Tasa de Descuento Diario (S/)</label>
          <input type="number" value={cuotaStr} onChange={(e) => setCuotaStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all" />
        </div>

        {capital > 0 && (
          <div className="bg-emerald-950/30 p-6 rounded-3xl border border-emerald-500/20 mt-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full"></div>
            <h4 className="text-[10px] font-black text-emerald-400 mb-5 flex items-center gap-2 uppercase tracking-widest"><AlertCircle size={14} /> Proyección (+20%)</h4>
            <div className="space-y-4 text-sm font-bold">
              <div className="flex justify-between text-slate-400"><span>BASE:</span> <span>S/ {capital.toFixed(2)}</span></div>
              <div className="flex justify-between text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]"><span>CARGO FIJO:</span> <span>+ S/ {interes.toFixed(2)}</span></div>
              <div className="flex justify-between pt-4 border-t border-emerald-500/20 text-white text-lg tracking-tight"><span>DEUDA NETA:</span> <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">S/ {deudaTotal.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] mt-8 flex justify-center items-center gap-2 uppercase tracking-widest transition-all">
          {loading ? <Loader2 size={20} className="animate-spin" /> : 'Inicializar Contrato'}
        </button>
      </form>
    </div>
  );
}

function InsightsTab({ stats, loans }) {
  const total = stats.totalDeuda > 0 ? stats.totalDeuda : 1; 
  const porcCapital = (stats.totalCapital / total) * 100;
  const porcInteres = (stats.totalIntereses / total) * 100;

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 mt-2">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">Telemetría</h2>
      </div>

      <div className="bg-rose-950/20 p-8 rounded-[32px] border border-rose-500/20 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-rose-500/10 blur-[40px] rounded-full pointer-events-none"></div>
        <div className="flex items-center gap-2 mb-6 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
          <TrendingUp size={24} />
          <h3 className="font-black text-xs uppercase tracking-widest">Fuga de Capital (Intereses)</h3>
        </div>
        <p className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">S/ {stats.totalIntereses.toFixed(2)}</p>
        <p className="text-xs text-rose-300/60 mb-8 font-bold uppercase tracking-widest">Penalización acumulada del sistema</p>
        
        <div className="w-full h-4 bg-black/50 rounded-full flex overflow-hidden mb-4 shadow-inner border border-white/5">
          <div className="bg-cyan-500 h-full relative" style={{ width: `${porcCapital}%` }}>
             <div className="absolute inset-0 bg-white/20 w-1/2 animate-[pulse_2s_infinite]"></div>
          </div>
          <div className="bg-rose-500 h-full shadow-[0_0_10px_rgba(244,63,94,0.8)] relative" style={{ width: `${porcInteres}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-cyan-400">Capital S/ {stats.totalCapital.toFixed(0)}</span>
          <span className="text-rose-400">Interés S/ {stats.totalIntereses.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-24 h-16 gap-1.5 transition-all duration-300 relative ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      {isActive && <div className="absolute inset-0 bg-white/10 rounded-2xl animate-in zoom-in duration-300"></div>}
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`}>{icon}</div>
      <span className={`relative z-10 text-[9px] uppercase tracking-widest ${isActive ? 'font-black text-cyan-100' : 'font-bold'}`}>{label}</span>
    </button>
  );
}