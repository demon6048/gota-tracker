import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, PlusCircle, PieChart, Wallet, Calendar, 
  CheckCircle, TrendingUp, Edit2, 
  Save, X, Loader2, Lock, AlertCircle, Trash2,
  Zap, ShieldAlert, Wifi, WifiOff, Loader,
  MessageCircle, Copy, Check, History, Clock, FileText
} from 'lucide-react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// ==========================================
// LLAVES DE GOTATRACKER2026 (BASE DE DATOS EN PRODUCCIÓN)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDlSt8D3T4taHJKZ1waAgVE14lS_j2lgms",
  authDomain: "gotatracker2026.firebaseapp.com",
  projectId: "gotatracker2026",
  storageBucket: "gotatracker2026.firebasestorage.app",
  messagingSenderId: "982001513919",
  appId: "1:982001513919:web:2aab1cd60a0ef13613dd0a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const coleccionGlobal = 'boveda_global'; 
const coleccionHistorial = 'historial_global';

// --- Utilidades de Fecha Seguras ---
const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysToDateStr = (dateStr, days) => {
  if (!dateStr) return getLocalTodayString();
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayOfWeek = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay(); // 0 = Domingo
};

const getEndDate = (startDate, daysToAdd) => {
  if (!startDate || isNaN(daysToAdd) || daysToAdd <= 0) return new Date();
  let date = new Date(startDate);
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++; // Saltar domingos
  }
  return date;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Fecha inválida';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

// --- Componente Principal ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState('connecting'); 
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loans, setLoans] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paymentModalData, setPaymentModalData] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error en autenticación:", error);
        setFirebaseStatus('error');
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Escuchar Préstamos
    const loansRef = collection(db, coleccionGlobal);
    const unsubLoans = onSnapshot(loansRef, async (snapshot) => {
      setFirebaseStatus('connected'); 
      
      const todayStr = getLocalTodayString();
      const yesterdayStr = addDaysToDateStr(todayStr, -1);

      if (snapshot.empty) {
        setLoans([]);
        setLoadingData(false);
      } else {
        const fetchedLoans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Lógica de Mora
        for (let loan of fetchedLoans) {
          if (loan.saldoPendiente <= 0) continue;

          let lastProc = loan.lastProcessedDate || yesterdayStr;
          let checkDate = addDaysToDateStr(lastProc, 1);
          let daysToAdd = 0;

          while (checkDate <= todayStr) {
            if (getDayOfWeek(checkDate) !== 0) { 
              daysToAdd++;
            }
            checkDate = addDaysToDateStr(checkDate, 1);
          }

          if (daysToAdd > 0) {
            let addExigible = daysToAdd * (loan.cuotaDiaria || 0);
            let currentExigible = loan.montoExigible || 0;
            
            try {
              const loanDoc = doc(db, coleccionGlobal, loan.id);
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
      }
    }, (error) => {
      console.error("Error fetching loans:", error);
      setFirebaseStatus('error');
      setLoadingData(false);
    });

    // Escuchar Historial Global
    const historyRef = collection(db, coleccionHistorial);
    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar localmente por fecha (más reciente primero) para evitar problemas de índices en Firebase
      logs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setHistoryLogs(logs);
    });

    return () => {
      unsubLoans();
      unsubHistory();
    };
  }, [user]);

  // --- Cálculos Globales ---
  const stats = useMemo(() => {
    let totalDeuda = 0, cuotaHoy = 0, totalCapital = 0, totalIntereses = 0;
    let saldoTotal = 0, exigibleTotal = 0;

    loans.forEach(loan => {
      totalDeuda += (loan.deudaTotal || 0);
      saldoTotal += (loan.saldoPendiente || 0);
      totalCapital += (loan.capital || 0);
      totalIntereses += (loan.interes || 0);
      
      if (loan.saldoPendiente > 0) {
        cuotaHoy += Math.min((loan.cuotaDiaria || 0), (loan.saldoPendiente || 0));
        exigibleTotal += (loan.montoExigible || 0);
      }
    });

    return { totalDeuda, cuotaHoy, totalCapital, totalIntereses, saldoTotal, exigibleTotal };
  }, [loans]);

  // --- Función de Registro de Historial ---
  const logActivity = async (tipo, prestamista, descripcion, monto = 0) => {
    try {
      await addDoc(collection(db, coleccionHistorial), {
        tipo,
        prestamista,
        descripcion,
        monto,
        fecha: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error al guardar en historial:", error);
    }
  };

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
      const loanDoc = doc(db, coleccionGlobal, loan.id);
      await updateDoc(loanDoc, {
        saldoPendiente: nuevoSaldo,
        montoExigible: nuevoExigible,
        pagadoAcumulado: nuevoPagado,
        lastManualPaymentDate: todayStr,
        manualPaymentsCount: count + 1,
        ultimoPagoMonto: amountPaid 
      });

      // Guardar en el Historial
      await logActivity('PAGO', loan.prestamista, `Abono registrado a favor de ${loan.prestamista}`, amountPaid);
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setFirebaseStatus('error');
    }
  };

  const handleEdit = async (id, nuevoSaldo, nuevaCuota, nuevoExigible) => {
    if (!user) return;
    try {
      const loanDoc = doc(db, coleccionGlobal, id);
      await updateDoc(loanDoc, {
        saldoPendiente: parseFloat(nuevoSaldo) || 0,
        cuotaDiaria: parseFloat(nuevaCuota) || 0,
        montoExigible: parseFloat(nuevoExigible) || 0
      });
      const loan = loans.find(l => l.id === id);
      if(loan) await logActivity('EDICION', loan.prestamista, `Parámetros modificados manualmente para ${loan.prestamista}`);
    } catch (error) {
      console.error("Error al editar:", error);
      setFirebaseStatus('error');
    }
  };

  const handleAddLoan = async (newLoan) => {
    if (!user) return;
    try {
      const loansRef = collection(db, coleccionGlobal);
      await addDoc(loansRef, newLoan);
      
      // Guardar en el Historial
      await logActivity('NUEVO', newLoan.prestamista, `Se inyectó un nuevo préstamo a ${newLoan.prestamista}`, newLoan.capital);
      
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Error al agregar:", error);
      setFirebaseStatus('error');
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      const loan = loans.find(l => l.id === id);
      if (loan) {
        // Guardar en el Historial ANTES de borrar
        await logActivity('ELIMINACION', loan.prestamista, `Se eliminó por completo el contrato de ${loan.prestamista}`);
      }
      
      const loanDoc = doc(db, coleccionGlobal, id);
      await deleteDoc(loanDoc);
    } catch (error) {
      console.error("Error al eliminar:", error);
      setFirebaseStatus('error');
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
        
        {/* Fondo Futurista */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-emerald-900/30 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-64 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <header className="p-6 pb-8 z-10 relative shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              <Zap className="text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,1)]" size={28} /> 
              <span>GOTA<span className="font-light text-slate-300">TRACKER</span></span>
            </h1>
            
            <div className={`px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest border flex items-center gap-1.5 shadow-lg uppercase transition-all duration-300 ${
              firebaseStatus === 'connected' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]' : 
              firebaseStatus === 'connecting' ? 'bg-amber-950/50 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]' : 
              'bg-rose-950/50 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            }`}>
              {firebaseStatus === 'connected' && <span className="flex items-center gap-1.5"><Wifi size={12} /> FIREBASE ACTIVO</span>}
              {firebaseStatus === 'connecting' && <span className="flex items-center gap-1.5"><Loader size={12} className="animate-spin" /> CONECTANDO...</span>}
              {firebaseStatus === 'error' && <span className="flex items-center gap-1.5"><WifiOff size={12} /> ERROR RED</span>}
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-wider">Deuda Global</p>
              <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                <span className="text-emerald-500/50 text-2xl mr-1">S/</span>
                <span>{stats.saldoTotal.toFixed(2)}</span>
              </h2>
            </div>
            <div className="text-right">
               <p className="text-slate-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Exigible Hoy</p>
               <h3 className={`text-2xl font-black ${stats.exigibleTotal > stats.cuotaHoy ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]'}`}>
                 <span className="text-sm mr-1 opacity-50">S/</span>
                 <span>{stats.exigibleTotal.toFixed(2)}</span>
               </h3>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-28 relative z-10 scroll-smooth">
          {activeTab === 'dashboard' && <DashboardTab loans={loans} onPayRequest={setPaymentModalData} onEdit={handleEdit} onDelete={handleDelete} />}
          {activeTab === 'add' && <AddLoanTab onAdd={handleAddLoan} />}
          {activeTab === 'history' && <HistoryTab logs={historyLogs} />}
          {activeTab === 'insights' && <InsightsTab stats={stats} loans={loans} />}
        </main>

        {/* Bottom Nav */}
        <nav className="absolute bottom-6 left-2 right-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 flex justify-around p-2 rounded-3xl z-20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <NavItem icon={<Home size={20} />} label="Panel" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<PlusCircle size={20} />} label="Nuevo" isActive={activeTab === 'add'} onClick={() => setActiveTab('add')} />
          <NavItem icon={<History size={20} />} label="Historial" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
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
  const activeLoans = loans.filter(l => (l.saldoPendiente || 0) > 0);
  
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
            <p className="text-white font-bold text-lg mb-1 tracking-wide">¡Base de Datos Limpia!</p>
            <p className="text-slate-500 text-sm">Registra tu primer préstamo en la pestaña NUEVO.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanCard({ loan, onPayRequest, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editSaldo, setEditSaldo] = useState((loan.saldoPendiente || 0).toString());
  const [editCuota, setEditCuota] = useState((loan.cuotaDiaria || 0).toString());
  const [editExigible, setEditExigible] = useState((loan.montoExigible || 0).toString());

  // Blindaje matemático y línea de tiempo
  const cuotaSegura = loan.cuotaDiaria > 0 ? loan.cuotaDiaria : 1;
  const cuotasRestantes = Math.ceil((loan.saldoPendiente || 0) / cuotaSegura);
  const fechaFin = getEndDate(loan.fechaInicio, cuotasRestantes);
  
  const deudaOriginal = loan.deudaTotal || 1; 
  const pagado = loan.pagadoAcumulado || 0;
  const porcentajeProgreso = Math.min(100, Math.max(0, (pagado / deudaOriginal) * 100));
  
  const todayStr = getLocalTodayString();
  const yaPagadoHoy = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;
  const exigible = loan.montoExigible || 0;

  let glowColor = "rgba(52,211,153,"; 
  let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusText = "EN LÍNEA";
  let isDanger = false;

  if (exigible > loan.cuotaDiaria) {
    glowColor = "rgba(244,63,94,"; 
    statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse";
    statusText = "MORA CRÍTICA";
    isDanger = true;
  } else if (exigible > 0) {
    glowColor = "rgba(251,191,36,"; 
    statusBadge = "bg-amber-400/10 text-amber-400 border-amber-400/20";
    statusText = "PENDIENTE";
  }

  const handleCopyYape = () => {
    if (!loan.yape) return;
    navigator.clipboard.writeText(loan.yape);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!loan.telefono) return;
    let mensaje = '';
    if (yaPagadoHoy && loan.ultimoPagoMonto) {
      mensaje = `Hola ${loan.prestamista}, adjunto mi comprobante del pago de hoy por S/ ${loan.ultimoPagoMonto.toFixed(2)}.%0A%0A💰 Saldo restante: S/ ${loan.saldoPendiente.toFixed(2)}%0A%0A¡Saludos!`;
    } else {
      mensaje = `Hola ${loan.prestamista}, te informo el estado de cuenta:%0A%0A💰 Restante: S/ ${loan.saldoPendiente.toFixed(2)}%0A⚠️ Exigible Actual: S/ ${exigible.toFixed(2)}%0A%0A¡Saludos!`;
    }
    window.open(`https://wa.me/51${loan.telefono}?text=${mensaje}`, '_blank');
  };

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
          <button onClick={() => onDelete(loan.id)} className="flex-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-3 rounded-2xl text-xs font-bold flex justify-center items-center gap-2 hover:bg-rose-500/20 transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <Trash2 size={16}/> PURGAR
          </button>
          <button onClick={() => { onEdit(loan.id, editSaldo, editCuota, editExigible); setIsEditing(false); }} className="flex-1 bg-cyan-500 text-black py-3 rounded-2xl text-xs font-black flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all">
            <Save size={16} /> CONFIRMAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group p-[1px] rounded-[32px] overflow-hidden transition-all duration-500 shadow-[0_10px_30px_-15px_${glowColor}0.3)] hover:shadow-[0_15px_40px_-10px_${glowColor}0.5)]`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${isDanger ? 'from-rose-500 via-rose-900 to-black' : 'from-slate-700 via-slate-800 to-black'} group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl p-5 sm:p-6 rounded-[31px] h-full border border-white/5 flex flex-col justify-between">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-2xl font-black text-white tracking-tight">{loan.prestamista}</h4>
              <button onClick={() => setIsEditing(true)} className="text-slate-600 hover:text-cyan-400 transition-colors bg-white/5 p-1.5 rounded-full"><Edit2 size={12} /></button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-bold tracking-widest uppercase">
              <Calendar size={12} className="text-slate-400" /> 
              <span>Fin aprox: {formatDate(fechaFin.toISOString())}</span>
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border flex items-center gap-1.5 shadow-lg ${statusBadge}`}>
            {isDanger && <ShieldAlert size={10} />}
            <span>{statusText}</span>
          </div>
        </div>

        {/* Línea de Tiempo (Progreso) */}
        <div className="mb-5 bg-black/40 p-3 rounded-2xl border border-white/5">
          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>Pagado: S/ {pagado.toFixed(2)}</span>
            <span>Total: S/ {deudaOriginal.toFixed(2)}</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden shadow-inner relative">
            <div 
              className={`h-full relative transition-all duration-1000 ease-out ${porcentajeProgreso >= 100 ? 'bg-cyan-500' : 'bg-emerald-500'}`} 
              style={{ width: `${porcentajeProgreso}%` }}>
              <div className="absolute inset-0 bg-white/20 w-1/2 animate-[pulse_2s_infinite]"></div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-1.5">
             <span className="text-[9px] text-slate-500 font-bold uppercase">{cuotasRestantes} días restantes</span>
             <span className="text-[10px] font-black text-emerald-400 tracking-wider">{porcentajeProgreso.toFixed(1)}% COMPLETADO</span>
          </div>
        </div>

        {/* Cajas de Valores */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-black/50 p-4 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Deuda Restante</p>
            <p className="text-lg font-black text-white">S/ {loan.saldoPendiente}</p>
          </div>
          <div className={`bg-black/50 p-4 rounded-2xl border ${isDanger ? 'border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'border-white/5'} shadow-inner relative overflow-hidden`}>
            {isDanger && <div className="absolute top-0 right-0 w-12 h-12 bg-rose-500/20 blur-xl rounded-full"></div>}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 relative z-10">Exigible</p>
            <p className={`text-xl font-black tracking-tight relative z-10 ${isDanger ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]' : (exigible > 0 ? 'text-amber-400' : 'text-slate-300')}`}>
              <span>S/ {exigible.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Acciones (Contacto y Pago) */}
        <div className="flex items-center justify-between mt-auto">
          {/* Botones de Contacto Rápidos */}
          <div className="flex gap-2">
             {loan.yape && (
               <button 
                 onClick={handleCopyYape}
                 className="w-10 h-10 rounded-xl bg-[#742284]/20 border border-[#742284]/40 flex items-center justify-center text-[#d87eed] hover:bg-[#742284]/40 transition-colors"
                 title="Copiar Yape"
               >
                 {copied ? <Check size={18} /> : <Copy size={18} />}
               </button>
             )}
             {loan.telefono && (
               <button 
                 onClick={handleWhatsApp}
                 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(34,197,94,0.1)] ${yaPagadoHoy ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}
                 title={yaPagadoHoy ? "Enviar Comprobante" : "Enviar Estado de Cuenta"}
               >
                 <MessageCircle size={18} />
               </button>
             )}
          </div>
          
          <button onClick={() => onPayRequest(loan)}
            className={`relative inline-flex items-center justify-center px-6 py-3.5 overflow-hidden font-black text-sm rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95
              ${yaPagadoHoy 
                ? 'bg-slate-900 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)]' 
                : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)]'}`}>
            <span className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none"></span>
            <span className="relative z-10 flex items-center gap-2 tracking-wide">
              {yaPagadoHoy ? <Lock size={16} /> : <Wallet size={16} />}
              <span>{yaPagadoHoy ? 'LOCK' : 'EJECUTAR'}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ loan, onClose, onSubmit }) {
  const [amount, setAmount] = useState((loan.montoExigible > 0 ? loan.montoExigible : loan.cuotaDiaria).toString());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Estados para la pantalla de éxito
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  
  const todayStr = getLocalTodayString();
  const requiresPassword = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return setError("Monto inválido detectado");
    if (numAmount > loan.saldoPendiente) return setError("Excede deuda máxima");
    if (requiresPassword && password !== 'KGB2026') return setError("ACCESO DENEGADO. Clave incorrecta.");
    
    await onSubmit(loan.id, numAmount);
    setPaidAmount(numAmount);
    setIsSuccess(true);
  };

  const handleSendReceipt = () => {
    if (!loan.telefono) return;
    const saldoActualizado = (loan.saldoPendiente - paidAmount).toFixed(2);
    const mensaje = `Hola ${loan.prestamista}, te acabo de transferir S/ ${paidAmount.toFixed(2)}.%0A%0A💰 Mi saldo restante es S/ ${saldoActualizado}.%0A%0A¡Saludos!`;
    window.open(`https://wa.me/51${loan.telefono}?text=${mensaje}`, '_blank');
    onClose();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 animate-in fade-in duration-300">
        <div className="bg-[#0a0a0a] w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.3)] p-8 pb-12 sm:pb-8 relative overflow-hidden animate-in zoom-in-95 duration-400">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 blur-[50px] pointer-events-none"></div>
          
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              <CheckCircle size={40} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            </div>
            
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">¡Pago Registrado!</h3>
            <p className="text-slate-400 font-bold mb-8">Se abonaron <span className="text-emerald-400">S/ {paidAmount.toFixed(2)}</span> a la cuenta de {loan.prestamista}</p>
            
            {loan.telefono ? (
              <button onClick={handleSendReceipt} className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 mb-4 hover:bg-[#1ebd5a] transition-colors shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                <MessageCircle size={22} /> Enviar Comprobante
              </button>
            ) : (
              <p className="text-amber-500/80 text-[10px] font-bold uppercase tracking-widest mb-4">No hay número de WhatsApp registrado para enviar comprobante.</p>
            )}
            
            <button onClick={onClose} className="w-full bg-white/5 border border-white/10 text-slate-300 font-bold py-4 rounded-2xl hover:bg-white/10 transition-colors uppercase tracking-widest text-xs">
              Cerrar Panel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] p-8 pb-12 sm:pb-8 relative overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-400">
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
              <label className="block text-[10px] font-bold text-rose-400 mb-2 flex items-center gap-2 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">
                <Lock size={12} /> <span>Protocolo (KGB2026):</span>
              </label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black border-2 border-rose-500/40 text-white rounded-3xl px-6 py-5 text-xl text-center tracking-[0.5em] outline-none focus:border-rose-400 focus:shadow-[0_0_20px_rgba(244,63,94,0.3)] shadow-inner transition-all" />
            </div>
          )}
          {error && <p className="text-rose-400 text-xs font-bold text-center uppercase tracking-widest animate-pulse drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]">{error}</p>}
        </div>

        <button onClick={handleSubmit} className="relative w-full overflow-hidden bg-emerald-500 text-black font-black py-5 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] text-lg tracking-widest uppercase transition-all transform hover:scale-[1.02] active:scale-[0.98]">
           <span className="absolute inset-0 bg-white/20 animate-pulse"></span>
           <span className="relative z-10 flex justify-center items-center gap-2">
             <span>Autorizar Pago</span>
             <CheckCircle size={20}/>
           </span>
        </button>
      </div>
    </div>
  );
}

function AddLoanTab({ onAdd }) {
  const [prestamista, setPrestamista] = useState('');
  const [telefono, setTelefono] = useState('');
  const [yape, setYape] = useState('');
  const [capitalStr, setCapitalStr] = useState('');
  const [porcentajeStr, setPorcentajeStr] = useState('20'); 
  const [cuotaStr, setCuotaStr] = useState('');
  const [loading, setLoading] = useState(false);

  const capital = parseFloat(capitalStr) || 0;
  const porcentaje = parseFloat(porcentajeStr) || 0;
  const interes = capital * (porcentaje / 100);
  const deudaTotal = capital + interes;
  const cuota = parseFloat(cuotaStr) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prestamista || capital <= 0 || cuota <= 0) return;
    setLoading(true);
    
    const yesterdayStr = addDaysToDateStr(getLocalTodayString(), -1);

    const newLoan = {
      prestamista, 
      telefono, 
      yape,
      capital, 
      porcentajeInteres: porcentaje,
      interes, 
      deudaTotal, 
      cuotaDiaria: cuota,
      saldoPendiente: deudaTotal, 
      montoExigible: 0, 
      pagadoAcumulado: 0,
      fechaInicio: new Date().toISOString(),
      lastProcessedDate: yesterdayStr,
      lastManualPaymentDate: null, 
      manualPaymentsCount: 0,
      ultimoPagoMonto: 0
    };

    await onAdd(newLoan);
    setLoading(false);
    setPrestamista('');
    setTelefono('');
    setYape('');
    setCapitalStr('');
    setPorcentajeStr('20');
    setCuotaStr('');
  };

  return (
    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8 tracking-tighter uppercase">Generar Contrato</h2>
      
      <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 space-y-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
        
        {/* Datos Personales */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Prestamista</label>
            <input type="text" value={prestamista} onChange={(e) => setPrestamista(e.target.value)} required className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all" placeholder="Ej. Steven" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nº WhatsApp</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all" placeholder="999..." />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nº Yape</label>
              <input type="tel" value={yape} onChange={(e) => setYape(e.target.value)} className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all" placeholder="999..." />
            </div>
          </div>
        </div>

        {/* Datos Financieros */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Capital (S/)</label>
              <input type="number" value={capitalStr} onChange={(e) => setCapitalStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-emerald-400 rounded-2xl px-4 py-4 font-black outline-none focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all text-lg" placeholder="500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Interés (%)</label>
              <input type="number" value={porcentajeStr} onChange={(e) => setPorcentajeStr(e.target.value)} required min="0" className="w-full bg-black/60 border border-white/10 text-rose-400 rounded-2xl px-4 py-4 font-black outline-none focus:border-rose-500 focus:shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all text-lg" placeholder="20" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Tasa de Descuento Diario (S/)</label>
            <input type="number" value={cuotaStr} onChange={(e) => setCuotaStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all" placeholder="25" />
          </div>
        </div>

        {capital > 0 && (
          <div className="bg-emerald-950/30 p-6 rounded-3xl border border-emerald-500/20 mt-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-xl rounded-full"></div>
            <h4 className="text-[10px] font-black text-emerald-400 mb-5 flex items-center gap-2 uppercase tracking-widest">
              <AlertCircle size={14} /> 
              <span>Proyección (+{porcentaje}%)</span>
            </h4>
            <div className="space-y-4 text-sm font-bold">
              <div className="flex justify-between text-slate-400"><span>BASE:</span> <span>S/ {capital.toFixed(2)}</span></div>
              <div className="flex justify-between text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]"><span>CARGO FIJO:</span> <span>+ S/ {interes.toFixed(2)}</span></div>
              <div className="flex justify-between pt-4 border-t border-emerald-500/20 text-white text-lg tracking-tight">
                <span>DEUDA NETA:</span> 
                <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">S/ {deudaTotal.toFixed(2)}</span>
              </div>
              {cuota > 0 && (
                 <div className="text-center mt-2 text-[10px] text-emerald-500/80 uppercase tracking-widest">
                   Se pagará en {Math.ceil(deudaTotal / cuota)} días hábiles
                 </div>
              )}
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] mt-8 flex justify-center items-center gap-2 uppercase tracking-widest transition-all">
          {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Inicializar Contrato</span>}
        </button>
      </form>
    </div>
  );
}

function HistoryTab({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center p-10 mt-10 relative z-10">
        <FileText className="mx-auto text-slate-700 mb-4" size={48} />
        <p className="text-slate-400 font-bold tracking-wide">Bitácora vacía</p>
        <p className="text-slate-600 text-xs mt-2">Los movimientos quedarán registrados aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 mt-2 flex items-center gap-3">
        <History className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" size={24} />
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">Bitácora de Auditoría</h2>
      </div>

      <div className="space-y-3">
        {logs.map(log => {
          let style = "bg-slate-900/50 border-slate-700";
          let icon = <Clock size={14} className="text-slate-500" />;
          let accent = "text-slate-400";
          
          if (log.tipo === 'PAGO') {
            style = "bg-emerald-950/20 border-emerald-500/20";
            icon = <CheckCircle size={14} className="text-emerald-500" />;
            accent = "text-emerald-400";
          } else if (log.tipo === 'NUEVO') {
            style = "bg-cyan-950/20 border-cyan-500/20";
            icon = <PlusCircle size={14} className="text-cyan-500" />;
            accent = "text-cyan-400";
          } else if (log.tipo === 'ELIMINACION') {
            style = "bg-rose-950/20 border-rose-500/20";
            icon = <Trash2 size={14} className="text-rose-500" />;
            accent = "text-rose-400";
          } else if (log.tipo === 'EDICION') {
            style = "bg-amber-950/20 border-amber-500/20";
            icon = <Edit2 size={14} className="text-amber-500" />;
            accent = "text-amber-400";
          }

          return (
            <div key={log.id} className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col gap-2 shadow-sm ${style}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>{log.tipo}</span>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-slate-500 font-bold uppercase">{formatDate(log.fecha)}</p>
                   <p className="text-[9px] text-slate-600">{formatTime(log.fecha)}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-white tracking-wide">{log.descripcion}</p>
              {log.monto > 0 && (
                 <p className={`text-lg font-black tracking-tight ${accent}`}>S/ {log.monto.toFixed(2)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsTab({ stats, loans }) {
  const total = stats.totalDeuda > 0 ? stats.totalDeuda : 1; 
  const porcCapital = (stats.totalCapital / total) * 100;
  const porcInteres = (stats.totalIntereses / total) * 100;

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 mt-2 flex items-center gap-3">
         <PieChart className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" size={24} />
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
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-[72px] h-14 gap-1 transition-all duration-300 relative ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      {isActive && <div className="absolute inset-0 bg-white/10 rounded-2xl animate-in zoom-in duration-300"></div>}
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`}>{icon}</div>
      <span className={`relative z-10 text-[8px] uppercase tracking-widest ${isActive ? 'font-black text-cyan-100' : 'font-bold'}`}>{label}</span>
    </button>
  );
}