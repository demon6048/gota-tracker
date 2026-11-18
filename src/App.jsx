import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, PlusCircle, PieChart, Wallet, Calendar, 
  CheckCircle, TrendingUp, Edit2, 
  Save, X, Loader2, Lock, Trash2,
  Zap, Wifi, WifiOff, Loader,
  MessageCircle, Copy, Check, History, Clock, FileText,
  Banknote, Smartphone, User, LayoutGrid,
  Calculator, ArrowRight, Hash,
  RotateCcw, BellRing, CalendarClock,
  Layers, RefreshCw, Search, Sparkles, Flame, Ban
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

// --- Utilidad para copiar texto de forma segura en cualquier navegador ---
const copyTextSafe = (text) => {
  if (!text) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (e) {
    return false;
  }
};

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

const getDaysUntilDue = (dueDateStr) => {
  if (!dueDateStr) return 999;
  const cleanStr = dueDateStr.includes('T') ? dueDateStr.split('T')[0] : dueDateStr;
  const todayStr = getLocalTodayString();
  const todayDate = new Date(todayStr + 'T12:00:00');
  const dueDate = new Date(cleanStr + 'T12:00:00');
  if (isNaN(dueDate.getTime())) return 999;
  const diffMs = dueDate.getTime() - todayDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getDayOfWeek = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
};

const getEndDate = (startDate, daysToAdd) => {
  if (!startDate || isNaN(daysToAdd) || daysToAdd <= 0) return new Date();
  let date = new Date(startDate);
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) added++;
  }
  return date;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Fecha inválida';
  const cleanStr = dateString.length === 10 ? dateString + 'T12:00:00' : dateString;
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

// ==========================================
// MOTOR ANTI-SPAM DE VOUCHERS WHATSAPP (22 VARIACIONES POR DÍA: YAPE, PLIN, EFECTIVO)
// ==========================================
const obtenerTextoViaPago = (metodoPago) => {
  if (metodoPago === 'EFECTIVO') return 'en efectivo (mano a mano)';
  if (metodoPago === 'PLIN') return 'por Plin';
  return 'por Yape';
};

const generarMensajeAntiSpam = ({ prestamista, fechaStr, horaStr, montoAbono, saldoRestante, metodoPago, nroOperacion }) => {
  const viaTexto = obtenerTextoViaPago(metodoPago);
  const monto = Number(montoAbono || 0).toFixed(2);
  const saldo = Number(saldoRestante || 0).toFixed(2);
  const lineaOp = nroOperacion ? `\n\uD83D\uDD22 N\u00BA Operaci\u00F3n: ${nroOperacion}` : '';

  const plantillas = [
    () => `\uD83E\uDD1D Hola ${prestamista}, te env\u00EDo el voucher y captura del pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDC4B Qu\u00E9 tal ${prestamista}, paso a dejarte el comprobante del abono de hoy realizado ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2705 Monto pagado: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Resta por pagar: S/ ${saldo}\n\n\uD83D\uDE4C \u00A1Que tengas excelente d\u00EDa!`,
    () => `\u2728 Buen d\u00EDa ${prestamista}, ya qued\u00F3 listo el pago de hoy ${viaTexto}. Aqu\u00ED te adjunto el pantallazo:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB5 Cuota abonada: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Saldo pendiente: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Muchas gracias!`,
    () => `\uD83D\uDCF2 Saludos ${prestamista}, te comparto el voucher de la cuota pagada hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Importe: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Nuevo saldo: S/ ${saldo}\n\n\uD83D\uDC4D \u00A1Seguimos al d\u00EDa!`,
    () => `\u2705 Hola ${prestamista}, cumpliendo con el abono del d\u00EDa ${viaTexto}. Te paso la captura:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Abonado hoy: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Cuenta restante: S/ ${saldo}\n\n\uD83C\uDF1F \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDCBC Estimado ${prestamista}, te env\u00EDo el respaldo del pago de hoy efectuado ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Pago: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo actual: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Saludos cordiales!`,
    () => `\uD83D\uDE80 Hola ${prestamista}, acabo de realizar el pago de hoy ${viaTexto}. Te adjunto el voucher:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2714\uFE0F Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Queda pendiente: S/ ${saldo}\n\n\u2728 \u00A1Gracias por confirmar!`,
    () => `\uD83D\uDC4B Buenas ${prestamista}, te confirmo que ya se hizo el abono de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB5 Monto enviado: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo restante: S/ ${saldo}\n\n\uD83D\uDE4C \u00A1Saludos!`,
    () => `\uD83E\uDDFE Qu\u00E9 tal ${prestamista}, aqu\u00ED tienes el detalle y captura del abono que acabo de hacer ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Valor abonado: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Por cancelar: S/ ${saldo}\n\n\uD83D\uDC4D \u00A1Buen d\u00EDa!`,
    () => `\u26A1 Hola ${prestamista}, listo el pago de la fecha ${viaTexto}. Te dejo el voucher:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\u2705 Cuota: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo a la fecha: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Nos vemos!`,
    () => `\uD83D\uDCF1 Hola ${prestamista}, te hago llegar el comprobante de la transferencia de hoy ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCB8 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Resta: S/ ${saldo}\n\n\u2728 \u00A1Excelente jornada!`,
    () => `\uD83D\uDCDD Qu\u00E9 tal ${prestamista}, registrando la cuota cumplida del d\u00EDa de hoy ${viaTexto}:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono del d\u00EDa: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}\n\n\uD83D\uDE4C \u00A1Muchas gracias!`,
    () => `\uD83D\uDD14 Hola ${prestamista}, ya est\u00E1 enviado el abono de hoy ${viaTexto}. Te paso el pantallazo:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\u2705 Pago: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Saldo pendiente: S/ ${saldo}\n\n\uD83D\uDC4D \u00A1Saludos!`,
    () => `\uD83C\uDF1F Saludos ${prestamista}, te env\u00EDo la captura del pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCB5 Abonado: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Restante: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Quedo atento!`,
    () => `\uD83D\uDC4B Hola ${prestamista}, te actualizo con el voucher del pago realizado hace un momento ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo actual: S/ ${saldo}\n\n\u2728 \u00A1Buen d\u00EDa!`,
    () => `\u2705 Buenas ${prestamista}, cumpliendo puntual con el pago de hoy ${viaTexto}:\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Cuota pagada: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Nuevo saldo: S/ ${saldo}\n\n\uD83D\uDE4C \u00A1Saludos!`,
    () => `\uD83D\uDCB3 Hola ${prestamista}, te dejo el comprobante de la cuota abonada hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2714\uFE0F Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Saldo por pagar: S/ ${saldo}\n\n\uD83D\uDC4D \u00A1Gracias!`,
    () => `\uD83D\uDE80 Qu\u00E9 tal ${prestamista}, pago efectuado con \u00E9xito hoy ${viaTexto}. Aqu\u00ED el voucher:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB5 Importe: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDCCA Hola ${prestamista}, te comparto la captura del pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Queda restando: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDC4B Saludos ${prestamista}, ya se hizo efectivo el abono del d\u00EDa ${viaTexto}. Adjunto captura:\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2705 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo pendiente: S/ ${saldo}\n\n\uD83C\uDF1F \u00A1Muchas gracias!`,
    () => `\uD83D\uDCF2 Hola ${prestamista}, adjunto el pantallazo del pago que acabo de realizar ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Pago hoy: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Resta: S/ ${saldo}\n\n\uD83D\uDC4D \u00A1Excelente d\u00EDa!`,
    () => `\uD83E\uDDFE Qu\u00E9 tal ${prestamista}, te env\u00EDo el voucher del abono de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Cuota abonada: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo restante: S/ ${saldo}\n\n\uD83E\uDD1D \u00A1Saludos!`
  ];

  const indiceAleatorio = Math.floor(Math.random() * plantillas.length);
  return plantillas[indiceAleatorio]();
};

const generarEstadoCuentaAntiSpam = ({ prestamista, fechaStr, horaStr, saldoRestante, exigible, modalidad, fechaVencimiento }) => {
  const saldo = Number(saldoRestante || 0).toFixed(2);
  const mora = Number(exigible || 0).toFixed(2);
  const extraFijo = modalidad === 'FIJO' && fechaVencimiento ? `\n\uD83D\uDDD3\uFE0F Vencimiento Pactado: ${formatDate(fechaVencimiento)}` : `\n\u26A0\uFE0F Exigible hoy: S/ ${mora}`;

  const plantillasEstado = [
    () => `\uD83E\uDD1D Hola ${prestamista}, te comparto el resumen actualizado de nuestra cuenta al d\u00EDa de hoy.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}${extraFijo}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDC4B Qu\u00E9 tal ${prestamista}, paso a enviarte el estado de cuenta actualizado:\n\n\uD83D\uDDD3\uFE0F D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCCA Por pagar: S/ ${saldo}${extraFijo}\n\n\uD83D\uDE4C \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDCDD Saludos ${prestamista}, as\u00ED va el avance de la cuenta hasta este momento:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB0 Resta total: S/ ${saldo}${extraFijo}\n\n\uD83D\uDC4D \u00A1Seguimos en contacto!`
  ];

  const idx = Math.floor(Math.random() * plantillasEstado.length);
  return plantillasEstado[idx]();
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

        for (let loan of fetchedLoans) {
          if (loan.saldoPendiente <= 0) continue;

          if (loan.modalidad === 'FIJO') {
            const diasParaVencer = getDaysUntilDue(loan.fechaVencimiento);
            const debeSerExigible = diasParaVencer <= 0 ? (loan.saldoPendiente || 0) : 0;
            if ((loan.montoExigible || 0) !== debeSerExigible) {
              try {
                const loanDoc = doc(db, coleccionGlobal, loan.id);
                await updateDoc(loanDoc, {
                  montoExigible: debeSerExigible,
                  lastProcessedDate: todayStr
                });
              } catch (error) {
                console.error("Error actualizando préstamo fijo:", error);
              }
            }
            continue;
          }

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

    const historyRef = collection(db, coleccionHistorial);
    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    let saldoTotal = 0, exigibleTotal = 0, alertasFijasCount = 0, disponiblesRuleteoCount = 0;

    loans.forEach(loan => {
      const saldo = loan.saldoPendiente || 0;
      const cuota = loan.cuotaDiaria || 25;
      const diasRest = cuota > 0 ? Math.ceil(saldo / cuota) : 99;

      if (!loan.yaMePrestoBloqueado && (saldo <= 0 || (loan.modalidad !== 'FIJO' && diasRest <= 5))) {
        disponiblesRuleteoCount++;
      }

      totalDeuda += (loan.deudaTotal || 0);
      saldoTotal += saldo;
      totalCapital += (loan.capital || 0);
      totalIntereses += (loan.interes || 0);
      
      if (saldo > 0) {
        if (loan.modalidad === 'FIJO') {
          const diasRestantes = getDaysUntilDue(loan.fechaVencimiento);
          const umbralAlerta = loan.diasAlerta || 5;
          if (diasRestantes <= umbralAlerta) {
            alertasFijasCount++;
          }
          if (diasRestantes <= 0) {
            exigibleTotal += saldo;
          }
        } else {
          cuotaHoy += Math.min(cuota, saldo);
          exigibleTotal += (loan.montoExigible || 0);
        }
      }
    });

    return { totalDeuda, cuotaHoy, totalCapital, totalIntereses, saldoTotal, exigibleTotal, alertasFijasCount, disponiblesRuleteoCount };
  }, [loans]);

  // --- Función de Registro de Historial ---
  const logActivity = async (tipo, prestamista, descripcion, monto = 0, loanId = null, metodo = 'YAPE', nroOperacion = '', extraData = {}) => {
    try {
      await addDoc(collection(db, coleccionHistorial), {
        tipo,
        prestamista,
        descripcion,
        monto,
        loanId,
        metodo,
        nroOperacion,
        fecha: new Date().toISOString(),
        ...extraData
      });
    } catch (error) {
      console.error("Error al guardar en historial:", error);
    }
  };

  // --- LIMPIAR HISTORIAL VIEJO DE UN COBRADOR CUANDO EMPIEZA NUEVO PRÉSTAMO ---
  const purgeOldLogsForLender = async (prestamistaName, loanId = null) => {
    const oldLogs = historyLogs.filter(
      l => (loanId && l.loanId === loanId) || (l.prestamista || '').toLowerCase() === (prestamistaName || '').toLowerCase()
    );
    for (const log of oldLogs) {
      try {
        await deleteDoc(doc(db, coleccionHistorial, log.id));
      } catch (e) {
        console.error("Error borrando log antiguo:", e);
      }
    }
  };

  // --- LIMPIAR TODOS LOS HISTORIALES DE PRÉSTAMOS ANTERIORES QUE YA NO EXISTEN ---
  const handlePurgeAllOldHistory = async (borrarTodoElHistorial = false) => {
    if (!user) return;
    const activeNames = new Set(loans.map(l => (l.prestamista || '').toLowerCase()));
    const activeIds = new Set(loans.map(l => l.id));

    for (const log of historyLogs) {
      const belongsToCurrent = activeIds.has(log.loanId) || activeNames.has((log.prestamista || '').toLowerCase());
      if (borrarTodoElHistorial || !belongsToCurrent) {
        try {
          await deleteDoc(doc(db, coleccionHistorial, log.id));
        } catch (e) {
          console.error("Error limpiando historial:", e);
        }
      }
    }
  };

  // --- MARCAR / DESMARCAR "YA ME PRESTÓ (EN NUEVO PRÉSTAMO)" ---
  const handleToggleYaMePresto = async (loanId, newValue) => {
    if (!user || !loanId) return;
    try {
      await updateDoc(doc(db, coleccionGlobal, loanId), {
        yaMePrestoBloqueado: Boolean(newValue)
      });
    } catch (error) {
      console.error("Error actualizando estado Ya me prestó:", error);
    }
  };

  // --- Handlers DB ---
  const executePayment = async (loanId, amountPaid, paymentMethod = 'YAPE', nroOperacion = '') => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !user) return;

    const todayStr = getLocalTodayString();
    const isSameDay = loan.lastManualPaymentDate === todayStr;
    const count = isSameDay ? (loan.manualPaymentsCount || 0) : 0;

    const nuevoSaldo = Math.max(0, loan.saldoPendiente - amountPaid);
    const nuevoExigible = Math.max(0, (loan.montoExigible || 0) - amountPaid);
    const nuevoPagado = (loan.pagadoAcumulado || 0) + amountPaid;

    const desbloquearRuleteo = nuevoSaldo <= 0 ? false : loan.yaMePrestoBloqueado;

    try {
      const loanDoc = doc(db, coleccionGlobal, loan.id);
      await updateDoc(loanDoc, {
        saldoPendiente: nuevoSaldo,
        montoExigible: nuevoExigible,
        pagadoAcumulado: nuevoPagado,
        lastManualPaymentDate: todayStr,
        manualPaymentsCount: count + 1,
        ultimoPagoMonto: amountPaid,
        ultimoPagoMetodo: paymentMethod,
        ultimoNroOperacion: nroOperacion || '',
        cupoDisponible: loan.cupoDisponible || loan.capital || 600,
        yaMePrestoBloqueado: desbloquearRuleteo
      });

      const opInfo = nroOperacion ? ` (Op. #${nroOperacion})` : '';
      await logActivity('PAGO', loan.prestamista, `Abono por ${paymentMethod} a favor de ${loan.prestamista}${opInfo}`, amountPaid, loan.id, paymentMethod, nroOperacion, {
        yapeAsociado: loan.yape || ''
      });
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setFirebaseStatus('error');
    }
  };

  // --- INICIAR NUEVO PRÉSTAMO / RENOVAR BORRANDO EL PRÉSTAMO ANTERIOR Y MARCANDO "YA ME PRESTÓ" ---
  const handleRenewLoan = async (loan, nuevoCapitalNegociado, nuevaCuotaNegociada, cuotasYaPagadasNuevoCiclo = 0) => {
    if (!user || !loan) return;
    try {
      const todayStr = getLocalTodayString();

      await purgeOldLogsForLender(loan.prestamista, loan.id);

      const cap = parseFloat(nuevoCapitalNegociado) || loan.capital || 600;
      const porc = loan.porcentajeInteres !== undefined ? loan.porcentajeInteres : 20;
      const nuevoInteres = cap * (porc / 100);
      const nuevaDeudaTotal = cap + nuevoInteres;
      const esFijo = loan.modalidad === 'FIJO';
      const cuotaCalculada = esFijo ? 0 : (parseFloat(nuevaCuotaNegociada) || Math.round(nuevaDeudaTotal / 24));
      const pagadoInicialNuevo = (parseFloat(cuotasYaPagadasNuevoCiclo) || 0) * cuotaCalculada;
      const saldoInicialNuevo = Math.max(0, nuevaDeudaTotal - pagadoInicialNuevo);

      const loanDoc = doc(db, coleccionGlobal, loan.id);
      await updateDoc(loanDoc, {
        capital: cap,
        cupoDisponible: cap,
        interes: nuevoInteres,
        deudaTotal: nuevaDeudaTotal,
        cuotaDiaria: cuotaCalculada,
        saldoPendiente: saldoInicialNuevo,
        pagadoAcumulado: pagadoInicialNuevo,
        montoExigible: 0,
        fechaInicio: new Date(todayStr + 'T12:00:00').toISOString(),
        lastProcessedDate: todayStr,
        lastManualPaymentDate: null,
        manualPaymentsCount: 0,
        ultimoPagoMonto: 0,
        ciclosCompletados: (loan.ciclosCompletados || 0) + 1,
        yaMePrestoBloqueado: true
      });

      await logActivity(
        'NUEVO',
        loan.prestamista,
        `Nuevo préstamo actual iniciado: Capital S/ ${cap.toFixed(0)} (Ya me prestó - Ciclo limpio)`,
        cap,
        loan.id
      );
    } catch (error) {
      console.error("Error al renovar préstamo:", error);
      setFirebaseStatus('error');
    }
  };

  const handleUpdateCupoNegociado = async (loanId, nuevoCupo, nuevaCuotaSugerida) => {
    if (!user || !loanId) return;
    try {
      const loanDoc = doc(db, coleccionGlobal, loanId);
      await updateDoc(loanDoc, {
        cupoDisponible: parseFloat(nuevoCupo) || 600,
        cuotaNegociada: parseFloat(nuevaCuotaSugerida) || 0
      });
    } catch (error) {
      console.error("Error al actualizar cupo negociado:", error);
    }
  };

  const handleEdit = async (id, prestamista, telefono, yape, nuevoSaldo, nuevaCuota, nuevoExigible, nuevaFecha, modalidadEdit = 'DIARIO', fechaVencimientoEdit = '', diasAlertaEdit = 5, cupoEdit = 0, limpiarHistorialAnterior = false, yaMePrestoEdit = false) => {
    if (!user) return;
    try {
      const loan = loans.find(l => l.id === id);
      const capNum = parseFloat(cupoEdit) || loan?.capital || 600;
      const porc = loan?.porcentajeInteres !== undefined ? loan.porcentajeInteres : 20;
      const interesCalc = capNum * (porc / 100);
      const deudaTotal = capNum + interesCalc;
      const saldoNum = parseFloat(nuevoSaldo) || 0;
      const nuevoPagadoAcumulado = Math.max(0, deudaTotal - saldoNum);

      if (limpiarHistorialAnterior && loan) {
        await purgeOldLogsForLender(prestamista || loan.prestamista, id);
      }

      const loanDoc = doc(db, coleccionGlobal, id);
      await updateDoc(loanDoc, {
        prestamista: prestamista || '',
        telefono: telefono || '',
        yape: yape || '',
        capital: capNum,
        interes: interesCalc,
        deudaTotal: deudaTotal,
        saldoPendiente: saldoNum,
        pagadoAcumulado: nuevoPagadoAcumulado,
        cuotaDiaria: modalidadEdit === 'FIJO' ? 0 : (parseFloat(nuevaCuota) || 0),
        montoExigible: parseFloat(nuevoExigible) || 0,
        fechaInicio: new Date(nuevaFecha + 'T12:00:00').toISOString(),
        modalidad: modalidadEdit,
        fechaVencimiento: modalidadEdit === 'FIJO' ? fechaVencimientoEdit : '',
        diasAlerta: parseInt(diasAlertaEdit, 10) || 5,
        cupoDisponible: capNum,
        yaMePrestoBloqueado: Boolean(yaMePrestoEdit)
      });
    } catch (error) {
      console.error("Error al editar:", error);
      setFirebaseStatus('error');
    }
  };

  const handleAddLoan = async (newLoan) => {
    if (!user) return;
    try {
      await purgeOldLogsForLender(newLoan.prestamista, null);

      const loansRef = collection(db, coleccionGlobal);
      const docRef = await addDoc(loansRef, {
        ...newLoan,
        yaMePrestoBloqueado: true
      });
      
      const desc = newLoan.modalidad === 'FIJO'
        ? `Nuevo préstamo Fijo (${formatDate(newLoan.fechaVencimiento)}) de ${newLoan.prestamista}`
        : `Nuevo préstamo actual iniciado con ${newLoan.prestamista}`;

      await logActivity('NUEVO', newLoan.prestamista, desc, newLoan.capital, docRef.id);
      
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
        await purgeOldLogsForLender(loan.prestamista, id);
      }
      const loanDoc = doc(db, coleccionGlobal, id);
      await deleteDoc(loanDoc);
    } catch (error) {
      console.error("Error al eliminar:", error);
      setFirebaseStatus('error');
    }
  };

  const handleRevertLog = async (log) => {
    if (!user) return;
    if (log.tipo !== 'PAGO') return; 

    try {
      const loan = loans.find(l => l.id === log.loanId || l.prestamista === log.prestamista);
      
      if (loan) {
        const nuevoSaldo = loan.saldoPendiente + log.monto;
        const nuevoPagado = Math.max(0, (loan.pagadoAcumulado || 0) - log.monto);
        
        await updateDoc(doc(db, coleccionGlobal, loan.id), {
          saldoPendiente: nuevoSaldo,
          pagadoAcumulado: nuevoPagado,
          lastManualPaymentDate: null, 
          manualPaymentsCount: Math.max(0, (loan.manualPaymentsCount || 1) - 1)
        });
      }

      const metodoOriginal = log.metodo || (log.descripcion && log.descripcion.toLowerCase().includes('efectivo') ? 'EFECTIVO' : 'YAPE');
      const yapeOriginal = log.yapeAsociado || loan?.yape || '';

      await deleteDoc(doc(db, coleccionHistorial, log.id));
      await logActivity(
        'REVERSO',
        log.prestamista,
        `Pago borrado/anulado (-S/ ${Number(log.monto || 0).toFixed(2)})`,
        log.monto,
        log.loanId,
        metodoOriginal,
        log.nroOperacion || '',
        {
          yapeAsociado: yapeOriginal,
          fechaPagoOriginal: log.fecha
        }
      );
      
    } catch (error) {
      console.error("Error al revertir pago:", error);
    }
  };

  const handleDeleteRevertedLog = async (logId) => {
    if (!user || !logId) return;
    try {
      await deleteDoc(doc(db, coleccionHistorial, logId));
    } catch (error) {
      console.error("Error al limpiar registro borrado:", error);
    }
  };

  const openPaymentWithAmount = (loan, customAmount = null) => {
    let autoCopied = false;
    if (loan?.yape) {
      autoCopied = copyTextSafe(loan.yape);
    }
    setPaymentModalData({ loan, customAmount, autoCopied });
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
    <div className="flex justify-center bg-[#030712] h-[100dvh] font-sans text-slate-200 overflow-hidden">
      <div className="w-full max-w-md bg-[#050505] h-full shadow-2xl flex flex-col relative ring-1 ring-white/5">
        
        {/* Fondo Futurista */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-emerald-900/30 to-transparent blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 blur-[80px] pointer-events-none"></div>

        {/* Header */}
        <header className="p-6 pb-6 z-10 relative shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl">
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
              <p className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-wider">Deuda Global Actual</p>
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
        <main className="flex-1 overflow-y-auto p-4 pb-28 relative z-10 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeTab === 'dashboard' && (
            <DashboardTab 
              loans={loans} 
              stats={stats} 
              onPayRequest={openPaymentWithAmount} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onRenew={handleRenewLoan}
              onToggleYaMePresto={handleToggleYaMePresto}
              onGoToDomino={() => setActiveTab('domino')}
            />
          )}
          {activeTab === 'domino' && (
            <DominoUrgentPlanTab
              loans={loans}
              onPayToZero={(loan) => openPaymentWithAmount(loan, loan.saldoPendiente)}
              onRenewLoan={handleRenewLoan}
              onUpdateCupo={handleUpdateCupoNegociado}
              onToggleYaMePresto={handleToggleYaMePresto}
            />
          )}
          {activeTab === 'add' && <AddLoanTab onAdd={handleAddLoan} />}
          {activeTab === 'history' && (
            <HistoryTab
              logs={historyLogs}
              loans={loans}
              onRevert={handleRevertLog}
              onDeleteReverted={handleDeleteRevertedLog}
              onPurgeLenderHistory={purgeOldLogsForLender}
              onPurgeAllOldHistory={handlePurgeAllOldHistory}
            />
          )}
          {activeTab === 'insights' && <InsightsTab stats={stats} loans={loans} />}
        </main>

        {/* Bottom Nav compacta y estática */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none z-30 flex justify-center bg-gradient-to-t from-black/80 to-transparent pt-8">
          <nav className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 flex justify-around p-1.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full max-w-[395px]">
            <NavItem icon={<Home size={18} />} label="Panel" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} badge={stats.alertasFijasCount} />
            <NavItem icon={<Layers size={18} />} label="Ruleteo" isActive={activeTab === 'domino'} onClick={() => setActiveTab('domino')} badge={stats.disponiblesRuleteoCount} />
            <NavItem icon={<PlusCircle size={18} />} label="Nuevo" isActive={activeTab === 'add'} onClick={() => setActiveTab('add')} />
            <NavItem icon={<History size={18} />} label="Cobrador" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavItem icon={<PieChart size={18} />} label="Datos" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
          </nav>
        </div>

        {paymentModalData && (
          <PaymentModal 
            loan={paymentModalData.loan} 
            initialAmount={paymentModalData.customAmount}
            autoCopiedInitial={paymentModalData.autoCopied}
            onClose={() => setPaymentModalData(null)} 
            onSubmit={executePayment} 
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO DE RULETEO & PLAN DE PRÉSTAMO URGENTE
// ==========================================
function DominoUrgentPlanTab({ loans, onPayToZero, onRenewLoan, onUpdateCupo, onToggleYaMePresto }) {
  const [metaUrgenteStr, setMetaUrgenteStr] = useState('1500');
  const [customCaps, setCustomCaps] = useState({});
  const [customQuotas, setCustomQuotas] = useState({});
  const [savedNoticeId, setSavedNoticeId] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const metaUrgente = parseFloat(metaUrgenteStr) || 0;

  const getCapForLoan = (loan) => {
    if (customCaps[loan.id] !== undefined) return parseFloat(customCaps[loan.id]) || 0;
    return loan.cupoDisponible || loan.capital || 600;
  };

  const getQuotaForLoan = (loan, capVal) => {
    if (customQuotas[loan.id] !== undefined) return parseFloat(customQuotas[loan.id]) || 0;
    const porc = loan.porcentajeInteres !== undefined ? loan.porcentajeInteres : 20;
    const totalConInteres = capVal * (1 + porc / 100);
    const diasCiclo = loan.cuotaDiaria > 0 && loan.deudaTotal > 0 ? Math.round(loan.deudaTotal / loan.cuotaDiaria) : 24;
    return Math.round(totalConInteres / (diasCiclo || 24));
  };

  const handleCapChange = (loan, newCapValue) => {
    const numCap = parseFloat(newCapValue) || 0;
    setCustomCaps(prev => ({ ...prev, [loan.id]: newCapValue }));
    const porc = loan.porcentajeInteres !== undefined ? loan.porcentajeInteres : 20;
    const totalConInteres = numCap * (1 + porc / 100);
    const diasCiclo = loan.cuotaDiaria > 0 && loan.deudaTotal > 0 ? Math.round(loan.deudaTotal / loan.cuotaDiaria) : 24;
    const autoQuota = Math.round(totalConInteres / (diasCiclo || 24));
    setCustomQuotas(prev => ({ ...prev, [loan.id]: autoQuota.toString() }));
  };

  const handleSaveNegotiation = async (loan) => {
    const cap = getCapForLoan(loan);
    const quota = getQuotaForLoan(loan, cap);
    await onUpdateCupo(loan.id, cap, quota);
    setSavedNoticeId(loan.id);
    setTimeout(() => setSavedNoticeId(null), 2200);
  };

  const handleExecuteDominoStep = async (loan) => {
    const cap = getCapForLoan(loan);
    const quota = getQuotaForLoan(loan, cap);
    setProcessingId(loan.id);
    await onRenewLoan(loan, cap, quota, 0);
    setProcessingId(null);
  };

  const { disponiblesParaRuleteo, bloqueadosYaMePrestaron } = useMemo(() => {
    const disp = [];
    const bloq = [];

    loans.forEach(loan => {
      const saldo = loan.saldoPendiente || 0;
      if (saldo <= 0 && !loan.yaMePrestoBloqueado) {
        disp.push(loan);
      } else if (loan.yaMePrestoBloqueado) {
        bloq.push(loan);
      } else {
        disp.push(loan);
      }
    });

    return { disponiblesParaRuleteo: disp, bloqueadosYaMePrestaron: bloq };
  }, [loans]);

  const prestamistasEnReserva = useMemo(() => {
    return disponiblesParaRuleteo.filter(l => (l.saldoPendiente || 0) <= 0);
  }, [disponiblesParaRuleteo]);

  const planDomino = useMemo(() => {
    const candidatos = disponiblesParaRuleteo.map(loan => {
      const saldoParaCero = loan.saldoPendiente || 0;
      const nuevoPrestamo = getCapForLoan(loan);
      const nuevaCuota = getQuotaForLoan(loan, nuevoPrestamo);
      const liquidezNetaLibre = nuevoPrestamo - saldoParaCero;
      const diasRestantes = loan.cuotaDiaria > 0 ? Math.ceil(saldoParaCero / loan.cuotaDiaria) : 0;

      return {
        loan,
        saldoParaCero,
        nuevoPrestamo,
        nuevaCuota,
        liquidezNetaLibre,
        diasRestantes,
        yaEnCero: saldoParaCero <= 0
      };
    })
    .filter(item => item.liquidezNetaLibre > 0)
    .sort((a, b) => {
      if (a.yaEnCero && !b.yaEnCero) return -1;
      if (!a.yaEnCero && b.yaEnCero) return 1;
      if (a.saldoParaCero !== b.saldoParaCero) return a.saldoParaCero - b.saldoParaCero;
      return b.nuevoPrestamo - a.nuevoPrestamo;
    });

    let acumuladoLibre = 0;
    const pasosSeleccionados = [];

    for (const item of candidatos) {
      const alcanzaMetaAntes = acumuladoLibre >= metaUrgente && metaUrgente > 0;
      acumuladoLibre += item.liquidezNetaLibre;

      pasosSeleccionados.push({
        ...item,
        acumuladoHastaAqui: acumuladoLibre,
        esNecesarioParaMeta: !alcanzaMetaAntes
      });
    }

    const pasosNecesarios = pasosSeleccionados.filter(p => p.esNecesarioParaMeta);
    const efectivoConseguidoEnMeta = pasosNecesarios.reduce((acc, p) => acc + p.liquidezNetaLibre, 0);
    const cuotaTotalEnMeta = pasosNecesarios.reduce((acc, p) => acc + p.nuevaCuota, 0);
    const capitalSemillaInicial = pasosNecesarios.length > 0 ? pasosNecesarios[0].saldoParaCero : 0;

    return {
      todosLosPasos: pasosSeleccionados,
      pasosNecesarios,
      efectivoConseguidoEnMeta,
      cuotaTotalEnMeta,
      capitalSemillaInicial
    };
  }, [disponiblesParaRuleteo, metaUrgente, customCaps, customQuotas]);

  return (
    <div className="space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="bg-gradient-to-br from-cyan-950/60 via-slate-900/90 to-emerald-950/50 border border-cyan-500/40 rounded-[28px] p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.6)] shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 block">
              Ruleteo Inteligente • Cancelando al Cero
            </span>
            <h2 className="text-xl font-black text-white tracking-tight uppercase">
              Plan de Préstamo Urgente
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-300 font-bold leading-relaxed mb-4">
          Los cobradores que <span className="text-rose-400">ya te prestaron en un nuevo ciclo</span> quedan excluidos automáticamente. Aquí solo entran los que están <span className="text-emerald-400">por terminar</span> o en <span className="text-cyan-400">Reserva (S/ 0)</span>.
        </p>

        <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <label className="block text-[10px] font-black text-cyan-300 uppercase tracking-widest">
            ¿Cuánto dinero libre necesitas juntar hoy? (S/)
          </label>
          <input
            type="number"
            value={metaUrgenteStr}
            onChange={(e) => setMetaUrgenteStr(e.target.value)}
            placeholder="Ej. 1500"
            className="w-full bg-black border-2 border-cyan-500/40 text-white rounded-2xl px-4 py-3 text-2xl font-black outline-none focus:border-cyan-400"
          />
          <div className="grid grid-cols-4 gap-2">
            {[1000, 1500, 2000, 3000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setMetaUrgenteStr(val.toString())}
                className={`py-2 rounded-xl text-[11px] font-black uppercase border transition-all ${
                  Number(metaUrgenteStr) === val
                    ? 'bg-cyan-400 text-black border-cyan-300'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                S/ {val}
              </button>
            ))}
          </div>
        </div>

        {planDomino.pasosNecesarios.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-black/60 p-3 rounded-2xl border border-amber-500/30">
              <span className="text-[9px] font-black text-amber-300 uppercase block">1er Paso (Semilla)</span>
              <span className="text-sm font-black text-white mt-0.5 block">
                S/ {planDomino.capitalSemillaInicial.toFixed(0)}
              </span>
              <span className="text-[8px] text-slate-400 font-bold">Para iniciar cadena</span>
            </div>
            <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/40">
              <span className="text-[9px] font-black text-emerald-300 uppercase block">Plata Libre Neta</span>
              <span className="text-base font-black text-emerald-400 mt-0.5 block">
                +S/ {planDomino.efectivoConseguidoEnMeta.toFixed(0)}
              </span>
              <span className="text-[8px] text-emerald-200/70 font-bold">
                En {planDomino.pasosNecesarios.length} cobrador(es)
              </span>
            </div>
            <div className="bg-cyan-950/40 p-3 rounded-2xl border border-cyan-500/40">
              <span className="text-[9px] font-black text-cyan-300 uppercase block">Nueva Cuota</span>
              <span className="text-sm font-black text-cyan-300 mt-0.5 block">
                S/ {planDomino.cuotaTotalEnMeta.toFixed(0)} /día
              </span>
              <span className="text-[8px] text-slate-400 font-bold">De los renovados</span>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 1: COBRADORES DISPONIBLES EN RESERVA (CANCELADOS AL CERO) */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-[28px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-300">
              En Reserva • Cancelados al Cero ({prestamistasEnReserva.length})
            </h3>
          </div>
          <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
            Listos para prestar
          </span>
        </div>

        {prestamistasEnReserva.length === 0 ? (
          <div className="p-4 rounded-2xl bg-black/50 border border-white/5 text-center">
            <p className="text-xs font-bold text-slate-400">
              Cuando termines de pagarle a un cobrador, quedará aquí en S/ 0 dispuesto a prestarte nuevamente.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {prestamistasEnReserva.map(loan => {
              const capVal = getCapForLoan(loan);
              const quotaVal = getQuotaForLoan(loan, capVal);
              const isSaved = savedNoticeId === loan.id;

              return (
                <div key={loan.id} className="bg-black/70 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{loan.prestamista}</h4>
                        <span className="bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          EN CERO • DISPONIBLE
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Último monto cancelado: S/ {loan.capital || 600}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-emerald-400 uppercase block">Te puede prestar</span>
                      <span className="text-lg font-black text-white">+S/ {capVal}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-emerald-300 uppercase">
                        Negociar Subida (S/)
                      </span>
                      <div className="flex gap-1">
                        {[600, 800, 900, 1000].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleCapChange(loan, preset.toString())}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${
                              Number(capVal) === preset
                                ? 'bg-emerald-400 text-black border-emerald-300'
                                : 'bg-black/60 text-slate-300 border-white/10'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nuevo Capital (S/)</label>
                        <input
                          type="number"
                          value={customCaps[loan.id] !== undefined ? customCaps[loan.id] : capVal}
                          onChange={(e) => handleCapChange(loan, e.target.value)}
                          className="w-full bg-black border border-emerald-500/40 text-emerald-300 rounded-xl px-3 py-2 text-sm font-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nueva Cuota (S/)</label>
                        <input
                          type="number"
                          value={customQuotas[loan.id] !== undefined ? customQuotas[loan.id] : quotaVal}
                          onChange={(e) => setCustomQuotas(prev => ({ ...prev, [loan.id]: e.target.value }))}
                          className="w-full bg-black border border-cyan-500/40 text-cyan-300 rounded-xl px-3 py-2 text-sm font-black outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveNegotiation(loan)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase hover:bg-white/10 flex items-center gap-1"
                    >
                      {isSaved ? <Check size={13} className="text-emerald-400" /> : <Save size={13} />}
                      <span>{isSaved ? 'Guardado' : 'Guardar Cupo'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === loan.id}
                      onClick={() => handleExecuteDominoStep(loan)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                    >
                      <RefreshCw size={14} className={processingId === loan.id ? 'animate-spin' : ''} />
                      <span>Iniciar Nuevo Préstamo S/ {capVal}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: CADENA DOMINÓ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
            <Flame size={15} />
            <span>Cadena de Ruleteo Activa ({planDomino.todosLosPasos.length})</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            Uno paga la cuenta del otro
          </span>
        </div>

        {planDomino.todosLosPasos.length === 0 ? (
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center space-y-2">
            <p className="text-xs text-slate-300 font-bold">
              No hay cobradores habilitados para ruletear en este momento.
            </p>
            <p className="text-[11px] text-slate-500">
              Si un cobrador de abajo ya está por terminar y quieres incluirlo en el ruleteo, toca <span className="text-cyan-400 font-bold">&quot;Habilitar Ruleteo&quot;</span> en la lista inferior.
            </p>
          </div>
        ) : (
          planDomino.todosLosPasos.map((paso, index) => {
            const { loan, saldoParaCero, nuevoPrestamo, nuevaCuota, liquidezNetaLibre, diasRestantes, yaEnCero, acumuladoHastaAqui, esNecesarioParaMeta } = paso;

            return (
              <div
                key={loan.id}
                className={`rounded-[26px] p-4 border transition-all space-y-3 ${
                  esNecesarioParaMeta
                    ? 'bg-gradient-to-br from-slate-900/95 via-slate-900 to-cyan-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                    : 'bg-slate-900/40 border-white/10 opacity-75'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                      esNecesarioParaMeta ? 'bg-cyan-400 text-black' : 'bg-white/10 text-slate-400'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-white">{loan.prestamista}</h4>
                        {yaEnCero ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            EN CERO (RESERVA)
                          </span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            FALTAN {diasRestantes} DÍA(S) • S/ {saldoParaCero.toFixed(0)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {yaEnCero
                          ? `Te presta S/ ${nuevoPrestamo} limpios`
                          : `Cancelas S/ ${saldoParaCero.toFixed(0)} al cero → Te vuelve a prestar S/ ${nuevoPrestamo}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Te Queda Libre</span>
                    <span className="text-lg font-black text-emerald-400">+S/ {liquidezNetaLibre.toFixed(0)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-black/60 p-2.5 rounded-2xl border border-white/5 text-center">
                  <div>
                    <span className="text-[8px] font-bold text-rose-400 uppercase block">Pagar para Cero</span>
                    <span className="text-xs font-black text-white">S/ {saldoParaCero.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-cyan-400 uppercase block">Nuevo Préstamo</span>
                    <span className="text-xs font-black text-cyan-300">S/ {nuevoPrestamo.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-emerald-400 uppercase block">Juntado Hasta Aquí</span>
                    <span className="text-xs font-black text-emerald-400">S/ {acumuladoHastaAqui.toFixed(0)}</span>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <span className="text-[9px] font-black text-slate-300 uppercase">
                      Subir préstamo si negocias:
                    </span>
                    <div className="flex gap-1">
                      {[600, 800, 900, 1000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleCapChange(loan, val.toString())}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${
                            Number(nuevoPrestamo) === val
                              ? 'bg-cyan-400 text-black border-cyan-300'
                              : 'bg-black/60 text-slate-400 border-white/10'
                          }`}
                        >
                          S/{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Préstamo Nuevo (S/)</label>
                      <input
                        type="number"
                        value={customCaps[loan.id] !== undefined ? customCaps[loan.id] : nuevoPrestamo}
                        onChange={(e) => handleCapChange(loan, e.target.value)}
                        className="w-full bg-black/80 border border-white/15 text-white rounded-xl px-3 py-1.5 text-xs font-black outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Nueva Cuota (S/)</label>
                      <input
                        type="number"
                        value={customQuotas[loan.id] !== undefined ? customQuotas[loan.id] : nuevaCuota}
                        onChange={(e) => setCustomQuotas(prev => ({ ...prev, [loan.id]: e.target.value }))}
                        className="w-full bg-black/80 border border-white/15 text-cyan-300 rounded-xl px-3 py-1.5 text-xs font-black outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleYaMePresto(loan.id, true)}
                    className="px-2.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[9px] font-black uppercase hover:bg-rose-500/20 flex items-center gap-1"
                  >
                    <Ban size={12} />
                    <span>Ya me prestó</span>
                  </button>

                  {!yaEnCero && (
                    <button
                      type="button"
                      onClick={() => onPayToZero(loan)}
                      className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-black py-2.5 px-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                    >
                      <Wallet size={13} />
                      <span>1. Cancelar S/ {saldoParaCero.toFixed(0)}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={processingId === loan.id}
                    onClick={() => handleExecuteDominoStep(loan)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-black py-2.5 px-3 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={13} className={processingId === loan.id ? 'animate-spin' : ''} />
                    <span>{yaEnCero ? `Activar S/ ${nuevoPrestamo}` : `2. Nuevo S/ ${nuevoPrestamo}`}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SECCIÓN 3: BLOQUEADOS PORQUE "YA ME PRESTARON / ESTÁN EN NUEVO PRÉSTAMO" */}
      <div className="bg-slate-900/60 border border-rose-500/25 rounded-[26px] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ban size={16} className="text-rose-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
              Ya me prestaron • En Nuevo Préstamo ({bloqueadosYaMePrestaron.length})
            </h4>
          </div>
          <span className="text-[9px] font-bold text-slate-400">No entran al ruleteo hoy</span>
        </div>

        {bloqueadosYaMePrestaron.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-2">
            Ningún cobrador está marcado como bloqueado.
          </p>
        ) : (
          <div className="space-y-2">
            {bloqueadosYaMePrestaron.map(loan => {
              const diasRest = loan.cuotaDiaria > 0 ? Math.ceil((loan.saldoPendiente || 0) / loan.cuotaDiaria) : 0;
              return (
                <div key={loan.id} className="bg-black/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{loan.prestamista}</span>
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                        YA ME PRESTÓ (EN CURSO)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      Resta: S/ {loan.saldoPendiente} ({diasRest} cuotas de S/ {loan.cuotaDiaria})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleYaMePresto(loan.id, false)}
                    className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[9px] font-black uppercase hover:bg-cyan-500/25"
                  >
                    Habilitar Ruleteo
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// RADAR DE ALERTA ANTICIPADA (3 A 5 DÍAS ANTES PARA PAGO ÚNICO / FECHA FIJA)
// ==========================================
function FixedLoansAlertRadar({ loans, onPayWithAmount }) {
  const [copiedId, setCopiedId] = useState(null);

  const alertasFijas = useMemo(() => {
    return loans
      .filter(l => l.modalidad === 'FIJO' && (l.saldoPendiente || 0) > 0)
      .map(loan => {
        const diasRestantes = getDaysUntilDue(loan.fechaVencimiento);
        const umbral = loan.diasAlerta || 5;
        return { loan, diasRestantes, umbral };
      })
      .filter(item => item.diasRestantes <= item.umbral)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [loans]);

  if (alertasFijas.length === 0) return null;

  const handleCopyYape = (loan) => {
    if (!loan.yape) return;
    copyTextSafe(loan.yape);
    setCopiedId(loan.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-amber-950/70 via-rose-950/50 to-slate-950 border-2 border-amber-500/60 rounded-[28px] p-4 shadow-[0_0_30px_rgba(245,158,11,0.25)] space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.7)] animate-bounce">
            <BellRing size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-300">
              Radar de Pago Único • Alerta Anticipada
            </h3>
            <p className="text-[10px] text-amber-200/80 font-bold">
              Prepárate: Tienes {alertasFijas.length} pago(s) fuerte(s) por vencer pronto
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {alertasFijas.map(({ loan, diasRestantes }) => {
          const isOverdue = diasRestantes < 0;
          const isToday = diasRestantes === 0;
          const ahorroPorDia = diasRestantes > 0 ? (loan.saldoPendiente / diasRestantes) : loan.saldoPendiente;
          const isCopied = copiedId === loan.id;

          return (
            <div key={loan.id} className="bg-black/70 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-white">{loan.prestamista}</span>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      isOverdue
                        ? 'bg-rose-500 text-black animate-pulse'
                        : isToday
                        ? 'bg-amber-400 text-black animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                    }`}>
                      {isOverdue
                        ? `¡VENCIDO HACE ${Math.abs(diasRestantes)} DÍA(S)!`
                        : isToday
                        ? '¡SE PAGA HOY MISMO!'
                        : `¡FALTAN ${diasRestantes} DÍA(S)!`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-bold mt-1">
                    Fecha exacta de pago: <span className="text-amber-300">{formatDate(loan.fechaVencimiento)}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Monto a Juntar</span>
                  <span className="text-lg font-black text-rose-400">S/ {Number(loan.saldoPendiente).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-200">
                  {diasRestantes > 0
                    ? `💡 Meta para llegar listo: Junta S/ ${ahorroPorDia.toFixed(2)} por día`
                    : `⚠️ Debes liquidar S/ ${Number(loan.saldoPendiente).toFixed(2)} hoy`}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {loan.yape && (
                  <button
                    type="button"
                    onClick={() => handleCopyYape(loan)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-1.5 border transition-all ${
                      isCopied
                        ? 'bg-fuchsia-500 text-black border-fuchsia-400'
                        : 'bg-[#742284]/30 text-[#e899fb] border-[#742284]/60 hover:bg-[#742284]/50'
                    }`}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied ? '¡Yape Copiado!' : `Yape: ${loan.yape}`}</span>
                  </button>
                )}

                <button
                  onClick={() => onPayWithAmount(loan, loan.saldoPendiente)}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all"
                >
                  <Wallet size={13} />
                  <span>Abonar / Liquidar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO CAJA DEL DÍA (CON AUTO-COPIADO DE YAPE AL INSTANTE)
// ==========================================
function DailyCashBox({ loans, onPayWithAmount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [presupuestoStr, setPresupuestoStr] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const activeDailyLoans = loans.filter(l => (l.saldoPendiente || 0) > 0 && l.modalidad !== 'FIJO');
  const todayStr = getLocalTodayString();

  const pendientesHoy = useMemo(() => {
    return activeDailyLoans
      .filter(l => !(l.lastManualPaymentDate === todayStr && (l.manualPaymentsCount || 0) >= 1))
      .sort((a, b) => {
        const moraA = (a.montoExigible || 0) - (a.cuotaDiaria || 0);
        const moraB = (b.montoExigible || 0) - (b.cuotaDiaria || 0);
        if (moraB !== moraA) return moraB - moraA;
        return (b.montoExigible || 0) - (a.montoExigible || 0);
      });
  }, [activeDailyLoans, todayStr]);

  const totalCuotasPendientesHoy = pendientesHoy.reduce((acc, l) => acc + Math.min(l.cuotaDiaria || 0, l.saldoPendiente || 0), 0);
  const totalExigiblePendienteHoy = pendientesHoy.reduce((acc, l) => acc + ((l.montoExigible || 0) > 0 ? l.montoExigible : Math.min(l.cuotaDiaria || 0, l.saldoPendiente || 0)), 0);

  const presupuesto = parseFloat(presupuestoStr) || 0;

  const planDistribucion = useMemo(() => {
    if (presupuesto <= 0) return { asignaciones: [], sobrante: 0 };
    let disponible = presupuesto;
    const asignaciones = [];

    for (const loan of pendientesHoy) {
      if (disponible <= 0) {
        asignaciones.push({ loan, montoAsignado: 0, estado: 'SIN_CAJA' });
        continue;
      }
      const metaCuota = Math.min(loan.cuotaDiaria || 0, loan.saldoPendiente || 0);
      const asignar = Math.min(disponible, metaCuota);
      disponible -= asignar;
      asignaciones.push({
        loan,
        montoAsignado: asignar,
        estado: asignar >= metaCuota ? 'CUOTA_COMPLETA' : 'PAGO_PARCIAL'
      });
    }

    if (disponible > 0) {
      for (let item of asignaciones) {
        if (disponible <= 0) break;
        const exigibleExtra = Math.max(0, (item.loan.montoExigible || 0) - item.montoAsignado);
        if (exigibleExtra > 0) {
          const extra = Math.min(disponible, exigibleExtra, item.loan.saldoPendiente - item.montoAsignado);
          item.montoAsignado += extra;
          disponible -= extra;
          if (extra > 0) item.estado = 'CUBRE_MORA';
        }
      }
    }

    return { asignaciones, sobrante: disponible };
  }, [presupuesto, pendientesHoy]);

  const handleCopyYapeInBox = (loan) => {
    if (!loan.yape) return;
    copyTextSafe(loan.yape);
    setCopiedId(loan.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (activeDailyLoans.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/30 border border-emerald-500/30 rounded-[28px] p-4 shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Calculator size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Caja del Día (Diarios)</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                {pendientesHoy.length} por pagar hoy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              Meta hoy: <span className="text-emerald-400">S/ {totalCuotasPendientesHoy.toFixed(2)}</span> • Con mora: <span className="text-amber-400">S/ {totalExigiblePendienteHoy.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/30 px-3 py-2 rounded-xl transition-colors">
          {isOpen ? 'Ocultar' : 'Abrir Caja'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-300">
          <div>
            <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">
              ¿Cuánto dinero tienes disponible hoy para repartir? (S/)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={presupuestoStr}
                onChange={(e) => setPresupuestoStr(e.target.value)}
                placeholder="Ej. 100"
                className="flex-1 bg-black/70 border border-emerald-500/40 text-white rounded-2xl px-4 py-3 text-lg font-black outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setPresupuestoStr(totalCuotasPendientesHoy.toString())}
                className="px-3 py-2 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/25"
              >
                Cuota Día (S/{totalCuotasPendientesHoy})
              </button>
            </div>
          </div>

          {pendientesHoy.length === 0 ? (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-center">
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">¡Todos los cobradores diarios de hoy ya fueron pagados!</p>
            </div>
          ) : presupuesto > 0 ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                <span className="text-slate-400">Ruta Sugerida (Al pagar copia Yape):</span>
                {planDistribucion.sobrante > 0 ? (
                  <span className="text-cyan-400">Te sobran: S/ {planDistribucion.sobrante.toFixed(2)}</span>
                ) : presupuesto < totalCuotasPendientesHoy ? (
                  <span className="text-rose-400">Faltan: S/ {(totalCuotasPendientesHoy - presupuesto).toFixed(2)}</span>
                ) : (
                  <span className="text-emerald-400">Caja Exacta</span>
                )}
              </div>

              {planDistribucion.asignaciones.map(({ loan, montoAsignado, estado }) => {
                const isYapeCopied = copiedId === loan.id;
                return (
                  <div key={loan.id} className="bg-black/60 border border-white/10 p-3 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-white text-sm">{loan.prestamista}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                            estado === 'CUBRE_MORA' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                            estado === 'CUOTA_COMPLETA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            estado === 'PAGO_PARCIAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {estado === 'CUBRE_MORA' ? 'Cuota + Mora' :
                             estado === 'CUOTA_COMPLETA' ? 'Cuota Completa' :
                             estado === 'PAGO_PARCIAL' ? 'Abono Parcial' : 'Sin Saldo'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Cuota: S/ {loan.cuotaDiaria} • Exigible: S/ {(loan.montoExigible || 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {loan.yape && (
                          <button
                            type="button"
                            onClick={() => handleCopyYapeInBox(loan)}
                            className={`px-2.5 py-2 rounded-xl text-[10px] font-black flex items-center gap-1 border transition-all ${
                              isYapeCopied
                                ? 'bg-fuchsia-500 text-black border-fuchsia-400'
                                : 'bg-[#742284]/30 text-[#e899fb] border-[#742284]/60 hover:bg-[#742284]/50'
                            }`}
                          >
                            {isYapeCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isYapeCopied ? '¡Yape Copiado!' : loan.yape}</span>
                          </button>
                        )}

                        {montoAsignado > 0 ? (
                          <button
                            onClick={() => onPayWithAmount(loan, montoAsignado)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-all"
                          >
                            <span>Pagar S/ {montoAsignado.toFixed(0)}</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-rose-400/70 uppercase px-2">Pendiente</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center italic">
              Escribe arriba cuánto dinero tienes hoy (ej. 100) para repartir y copiar el Yape con un toque.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PANEL PRINCIPAL
// ==========================================
function DashboardTab({ loans, stats, onPayRequest, onEdit, onDelete, onRenew, onToggleYaMePresto, onGoToDomino }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ACTIVOS');
  const [sortBy, setSortBy] = useState('URGENCIA');

  const activeLoans = loans.filter(l => (l.saldoPendiente || 0) > 0);
  const reserveLoans = loans.filter(l => (l.saldoPendiente || 0) <= 0);
  const nearFinishLoans = activeLoans.filter(l => {
    if (l.modalidad === 'FIJO') return getDaysUntilDue(l.fechaVencimiento) <= 5;
    const diasRest = l.cuotaDiaria > 0 ? Math.ceil(l.saldoPendiente / l.cuotaDiaria) : 99;
    return diasRest <= 5;
  });
  const fixedActiveLoans = activeLoans.filter(l => l.modalidad === 'FIJO');

  const filteredAndSortedLoans = useMemo(() => {
    let baseList = [];
    if (filterCategory === 'ACTIVOS') baseList = activeLoans;
    else if (filterCategory === 'POR_TERMINAR') baseList = nearFinishLoans;
    else if (filterCategory === 'RESERVA') baseList = reserveLoans;
    else if (filterCategory === 'FIJOS') baseList = fixedActiveLoans;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      baseList = baseList.filter(l => (l.prestamista || '').toLowerCase().includes(q));
    }

    return [...baseList].sort((a, b) => {
      if (sortBy === 'CERCA_CERO') {
        return (a.saldoPendiente || 0) - (b.saldoPendiente || 0);
      }
      if (sortBy === 'CUOTA') {
        return (b.cuotaDiaria || 0) - (a.cuotaDiaria || 0);
      }
      if (sortBy === 'NOMBRE') {
        return (a.prestamista || '').localeCompare(b.prestamista || '');
      }
      return (b.montoExigible || 0) - (a.montoExigible || 0);
    });
  }, [filterCategory, searchQuery, sortBy, activeLoans, nearFinishLoans, reserveLoans, fixedActiveLoans]);

  return (
    <div className="space-y-4 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FixedLoansAlertRadar loans={loans} onPayWithAmount={onPayRequest} />

      <DailyCashBox loans={loans} stats={stats} onPayWithAmount={onPayRequest} />

      {/* Acceso Rápido al Ruleteo / Plan Urgente */}
      <div
        onClick={onGoToDomino}
        className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-emerald-950/60 border border-cyan-500/40 rounded-[24px] p-3.5 flex items-center justify-between cursor-pointer hover:border-cyan-400 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Plan Préstamo Urgente (Ruleteo)</span>
              {nearFinishLoans.length > 0 && (
                <span className="bg-amber-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                  {nearFinishLoans.length} por terminar
                </span>
              )}
            </div>
            <p className="text-[10px] text-cyan-300/80 font-bold">
              Excluye a los que ya te prestaron • Usa solo disponibles
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-cyan-400" />
      </div>

      {/* BARRA DE ORGANIZACIÓN Y ORDENAMIENTO */}
      <div className="bg-slate-900/90 border border-white/10 rounded-[26px] p-3.5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cobrador..."
              className="w-full bg-black/70 border border-white/10 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-cyan-400"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/70 border border-white/10 text-cyan-300 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-cyan-400 h-full"
            >
              <option value="URGENCIA">Orden: Urgencia</option>
              <option value="CERCA_CERO">Orden: Cerca a Cero</option>
              <option value="CUOTA">Orden: Mayor Cuota</option>
              <option value="NOMBRE">Orden: Nombre A-Z</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory('ACTIVOS')}
            className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              filterCategory === 'ACTIVOS'
                ? 'bg-emerald-500 text-black'
                : 'bg-black/50 text-slate-400 border border-white/5'
            }`}
          >
            Activos ({activeLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('POR_TERMINAR')}
            className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              filterCategory === 'POR_TERMINAR'
                ? 'bg-amber-400 text-black'
                : 'bg-black/50 text-amber-300/80 border border-white/5'
            }`}
          >
            ≤5 Días ({nearFinishLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('FIJOS')}
            className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              filterCategory === 'FIJOS'
                ? 'bg-purple-500 text-black'
                : 'bg-black/50 text-purple-300/80 border border-white/5'
            }`}
          >
            Fijos ({fixedActiveLoans.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('RESERVA')}
            className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
              filterCategory === 'RESERVA'
                ? 'bg-cyan-400 text-black'
                : 'bg-black/50 text-cyan-300/80 border border-white/5'
            }`}
          >
            Reserva ({reserveLoans.length})
          </button>
        </div>
      </div>

      {/* Lista de Tarjetas */}
      <div className="space-y-4">
        {filteredAndSortedLoans.map(loan => (
          <LoanCard
            key={loan.id}
            loan={loan}
            onPayRequest={(l, amt = null) => onPayRequest(l, amt)}
            onEdit={onEdit}
            onDelete={onDelete}
            onRenew={onRenew}
            onToggleYaMePresto={onToggleYaMePresto}
          />
        ))}

        {filteredAndSortedLoans.length === 0 && (
          <div className="text-center p-8 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
            <CheckCircle className="mx-auto text-emerald-400 mb-3" size={38} />
            <p className="text-white font-bold text-sm mb-1">
              {filterCategory === 'RESERVA'
                ? 'Aún no tienes prestamistas cancelados en Reserva'
                : filterCategory === 'POR_TERMINAR'
                ? 'Ningún préstamo está a 5 días o menos de terminar'
                : 'No hay préstamos en esta vista'}
            </p>
            <p className="text-slate-500 text-xs">
              Usa las pestañas de arriba o registra un contrato en NUEVO.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanCard({ loan, onPayRequest, onEdit, onDelete, onRenew, onToggleYaMePresto }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [editPrestamista, setEditPrestamista] = useState(loan.prestamista || '');
  const [editWhatsApp, setEditWhatsApp] = useState(loan.telefono || '');
  const [editYape, setEditYape] = useState(loan.yape || '');
  const [editSaldo, setEditSaldo] = useState((loan.saldoPendiente || 0).toString());
  const [editCuota, setEditCuota] = useState((loan.cuotaDiaria || 0).toString());
  const [editExigible, setEditExigible] = useState((loan.montoExigible || 0).toString());
  const initialDateStr = loan.fechaInicio ? loan.fechaInicio.split('T')[0] : getLocalTodayString();
  const [editFechaInicio, setEditFechaInicio] = useState(initialDateStr);
  const [editModalidad, setEditModalidad] = useState(loan.modalidad || 'DIARIO');
  const [editFechaVencimiento, setEditFechaVencimiento] = useState(loan.fechaVencimiento || addDaysToDateStr(getLocalTodayString(), 15));
  const [editDiasAlerta, setEditDiasAlerta] = useState(loan.diasAlerta || 5);
  const [editCupo, setEditCupo] = useState((loan.cupoDisponible || loan.capital || 600).toString());
  const [limpiarHistorialViejoCheck, setLimpiarHistorialViejoCheck] = useState(true);
  const [editYaMePresto, setEditYaMePresto] = useState(Boolean(loan.yaMePrestoBloqueado));

  const baseCap = loan.cupoDisponible || loan.capital || 600;
  const [renewCap, setRenewCap] = useState(baseCap.toString());
  const [renewQuota, setRenewQuota] = useState((loan.cuotaDiaria || Math.round((baseCap * 1.2) / 24)).toString());
  const [renewCuotasPagadas, setRenewCuotasPagadas] = useState('0');

  const esEnReserva = (loan.saldoPendiente || 0) <= 0;
  const esFijo = loan.modalidad === 'FIJO';
  const diasParaVencer = esFijo ? getDaysUntilDue(loan.fechaVencimiento) : 999;
  const umbralAlerta = loan.diasAlerta || 5;
  const enVentanaAlerta = !esEnReserva && esFijo && diasParaVencer <= umbralAlerta;

  const cuotaSegura = loan.cuotaDiaria > 0 ? loan.cuotaDiaria : 1;
  const cuotasRestantes = esFijo ? Math.max(0, diasParaVencer) : Math.ceil((loan.saldoPendiente || 0) / cuotaSegura);
  const fechaFin = esFijo && loan.fechaVencimiento ? new Date(loan.fechaVencimiento + 'T12:00:00') : getEndDate(loan.fechaInicio, cuotasRestantes);
  
  const deudaOriginal = loan.deudaTotal || 1; 
  const pagado = loan.pagadoAcumulado || 0;
  const porcentajeProgreso = esEnReserva ? 100 : Math.min(100, Math.max(0, (pagado / deudaOriginal) * 100));
  
  const todayStr = getLocalTodayString();
  const yaPagadoHoy = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;
  const exigible = loan.montoExigible || 0;
  const estaCercaDeCero = !esEnReserva && !esFijo && cuotasRestantes <= 3;

  let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  let statusText = "EN LÍNEA";
  let isDanger = false;

  if (esEnReserva) {
    statusBadge = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40";
    statusText = `RESERVA • PRESTA S/ ${baseCap}`;
  } else if (esFijo) {
    if (diasParaVencer < 0) {
      statusBadge = "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      statusText = `VENCIDO (${Math.abs(diasParaVencer)}D)`;
      isDanger = true;
    } else if (diasParaVencer === 0) {
      statusBadge = "bg-amber-400 text-black border-amber-300 animate-pulse";
      statusText = "¡VENCE HOY!";
      isDanger = true;
    } else if (enVentanaAlerta) {
      statusBadge = "bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse";
      statusText = `ALERTA: FALTAN ${diasParaVencer}D`;
    } else {
      statusBadge = "bg-purple-500/15 text-purple-300 border-purple-500/30";
      statusText = `FIJO • FALTAN ${diasParaVencer}D`;
    }
  } else {
    if (exigible > loan.cuotaDiaria) {
      statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse";
      statusText = "MORA CRÍTICA";
      isDanger = true;
    } else if (estaCercaDeCero) {
      statusBadge = "bg-cyan-500/20 text-cyan-300 border-cyan-400/40";
      statusText = `¡A ${cuotasRestantes}D DE CERO!`;
    } else if (exigible > 0) {
      statusBadge = "bg-amber-400/10 text-amber-400 border-amber-400/20";
      statusText = "PENDIENTE";
    }
  }

  const handleCopyYape = () => {
    if (!loan.yape) return;
    copyTextSafe(loan.yape);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenewCapPreset = (val) => {
    setRenewCap(val.toString());
    const porc = loan.porcentajeInteres !== undefined ? loan.porcentajeInteres : 20;
    const total = val * (1 + porc / 100);
    setRenewQuota(Math.round(total / 24).toString());
  };

  const handleWhatsApp = () => {
    if (!loan.telefono) return;
    
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    let mensajePlano = '';
    if (yaPagadoHoy && loan.ultimoPagoMonto) {
      mensajePlano = generarMensajeAntiSpam({
        prestamista: loan.prestamista,
        fechaStr,
        horaStr,
        montoAbono: loan.ultimoPagoMonto,
        saldoRestante: loan.saldoPendiente,
        metodoPago: loan.ultimoPagoMetodo || 'YAPE',
        nroOperacion: loan.ultimoNroOperacion || ''
      });
    } else {
      mensajePlano = generarEstadoCuentaAntiSpam({
        prestamista: loan.prestamista,
        fechaStr,
        horaStr,
        saldoRestante: loan.saldoPendiente,
        exigible,
        modalidad: loan.modalidad || 'DIARIO',
        fechaVencimiento: loan.fechaVencimiento
      });
    }
    
    const urlSegura = `https://api.whatsapp.com/send?phone=51${loan.telefono}&text=${encodeURIComponent(mensajePlano)}`;
    window.open(urlSegura, '_blank');
  };

  if (isEditing) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl p-5 rounded-[28px] border border-cyan-500/40 animate-in fade-in duration-300 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-base font-black text-cyan-400 uppercase">Ajustar / Iniciar Nuevo Ciclo</h4>
          <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white bg-white/5 p-2 rounded-full"><X size={16} /></button>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5">
          <span className="text-[10px] font-black text-emerald-300 uppercase block">
            🔄 ¿Ya estás en un NUEVO PRÉSTAMO con {loan.prestamista}?
          </span>
          <p className="text-[10px] text-slate-300 font-bold">
            Borra sus pagos viejos, inicia su nuevo ciclo limpio y lo marca como &quot;Ya me prestó&quot;.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Capital Nuevo</label>
              <input
                type="number"
                value={renewCap}
                onChange={(e) => handleRenewCapPreset(parseFloat(e.target.value) || 0)}
                className="w-full bg-black border border-emerald-500/40 text-white rounded-xl px-2.5 py-1.5 text-xs font-black"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Cuota Diaria</label>
              <input
                type="number"
                value={renewQuota}
                onChange={(e) => setRenewQuota(e.target.value)}
                className="w-full bg-black border border-emerald-500/40 text-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-black"
              />
            </div>
            <div>
              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Días Ya Pagados</label>
              <input
                type="number"
                value={renewCuotasPagadas}
                onChange={(e) => setRenewCuotasPagadas(e.target.value)}
                className="w-full bg-black border border-cyan-500/40 text-cyan-300 rounded-xl px-2.5 py-1.5 text-xs font-black"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await onRenew(loan, renewCap, renewQuota, renewCuotasPagadas);
              setIsEditing(false);
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Comenzar Este Nuevo Préstamo Limpio</span>
          </button>
        </div>
        
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setEditModalidad('DIARIO')}
              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                editModalidad === 'DIARIO' ? 'bg-emerald-500 text-black' : 'text-slate-400'
              }`}
            >
              Cuota Diaria
            </button>
            <button
              type="button"
              onClick={() => setEditModalidad('FIJO')}
              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                editModalidad === 'FIJO' ? 'bg-purple-500 text-black' : 'text-slate-400'
              }`}
            >
              Pago Único / Fijo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Prestamista</label>
              <input type="text" value={editPrestamista} onChange={(e) => setEditPrestamista(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-cyan-400 mb-1 uppercase">Capital / Cupo (S/)</label>
              <input type="number" value={editCupo} onChange={(e) => setEditCupo(e.target.value)} className="w-full bg-black/50 border border-cyan-500/30 text-cyan-300 rounded-2xl px-4 py-2.5 text-sm font-black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">WhatsApp</label>
              <input type="tel" value={editWhatsApp} onChange={(e) => setEditWhatsApp(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Yape / Plin</label>
              <input type="tel" value={editYape} onChange={(e) => setEditYape(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Deuda Restante</label>
              <input type="number" value={editSaldo} onChange={(e) => setEditSaldo(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Monto Exigible</label>
              <input type="number" value={editExigible} onChange={(e) => setEditExigible(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
            </div>
          </div>

          {editModalidad === 'FIJO' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-purple-400 mb-1 uppercase">Fecha Exacta Pago</label>
                <input type="date" value={editFechaVencimiento} onChange={(e) => setEditFechaVencimiento(e.target.value)} className="w-full bg-black/50 border border-purple-500/40 text-white rounded-2xl px-3 py-2.5 text-[11px] font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-400 mb-1 uppercase">Avisar Antes</label>
                <select value={editDiasAlerta} onChange={(e) => setEditDiasAlerta(Number(e.target.value))} className="w-full bg-black/50 border border-amber-500/40 text-white rounded-2xl px-3 py-2.5 text-xs font-bold">
                  <option value={3}>3 días antes</option>
                  <option value={5}>5 días antes</option>
                  <option value={7}>7 días antes</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Cuota Diaria (S/)</label>
                <input type="number" value={editCuota} onChange={(e) => setEditCuota(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-2.5 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Día de Entrega</label>
                <input type="date" value={editFechaInicio} onChange={(e) => setEditFechaInicio(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-3 py-2.5 text-[11px] font-bold" />
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-rose-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editYaMePresto}
                onChange={(e) => setEditYaMePresto(e.target.checked)}
                className="rounded accent-rose-500 w-4 h-4"
              />
              <span>🔒 Ya me prestó (No incluir como disponible en Ruleteo)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-cyan-300 cursor-pointer">
              <input
                type="checkbox"
                checked={limpiarHistorialViejoCheck}
                onChange={(e) => setLimpiarHistorialViejoCheck(e.target.checked)}
                className="rounded accent-cyan-400 w-4 h-4"
              />
              <span>🧹 Limpiar pagos del préstamo anterior al guardar</span>
            </label>
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button onClick={() => onDelete(loan.id)} className="flex-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-3 rounded-2xl text-xs font-bold flex justify-center items-center gap-2 hover:bg-rose-500/20">
            <Trash2 size={16}/> ELIMINAR
          </button>
          <button onClick={() => { 
              onEdit(loan.id, editPrestamista, editWhatsApp, editYape, editSaldo, editCuota, editExigible, editFechaInicio, editModalidad, editFechaVencimiento, editDiasAlerta, editCupo, limpiarHistorialViejoCheck, editYaMePresto); 
              setIsEditing(false); 
            }} 
            className="flex-1 bg-cyan-500 text-black py-3 rounded-2xl text-xs font-black flex justify-center items-center gap-2">
            <Save size={16} /> GUARDAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group p-[1px] rounded-[32px] overflow-hidden transition-all duration-500">
      <div className={`absolute inset-0 bg-gradient-to-br ${
        esEnReserva
          ? 'from-cyan-500 via-emerald-900 to-black'
          : isDanger
          ? 'from-rose-500 via-rose-900 to-black'
          : enVentanaAlerta
          ? 'from-amber-400 via-amber-900 to-black'
          : esFijo
          ? 'from-purple-500 via-slate-800 to-black'
          : 'from-slate-700 via-slate-800 to-black'
      }`}></div>
      
      <div className="relative bg-[#0a0a0a]/90 backdrop-blur-2xl p-5 sm:p-6 rounded-[31px] h-full border border-white/5 flex flex-col justify-between">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-2xl font-black text-white tracking-tight">{loan.prestamista}</h4>
              {esFijo && (
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  PAGO ÚNICO
                </span>
              )}
              {!esEnReserva && (
                <button
                  type="button"
                  onClick={() => onToggleYaMePresto && onToggleYaMePresto(loan.id, !loan.yaMePrestoBloqueado)}
                  className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border transition-all ${
                    loan.yaMePrestoBloqueado
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {loan.yaMePrestoBloqueado ? '🔒 Ya me prestó' : '⚡ Ruleteable'}
                </button>
              )}
              <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-cyan-400 transition-colors bg-white/5 p-1.5 rounded-full"><Edit2 size={12} /></button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-bold tracking-widest uppercase">
              <Calendar size={12} className={esEnReserva ? 'text-cyan-400' : esFijo ? 'text-purple-400' : 'text-slate-400'} /> 
              <span>
                {esEnReserva
                  ? `Cancelado al Cero • Dispuesto a prestar S/ ${baseCap}`
                  : esFijo
                  ? `Día de Pago: ${formatDate(loan.fechaVencimiento)} (Aviso ${umbralAlerta}d antes)`
                  : `Fin aprox: ${formatDate(fechaFin.toISOString())} • Préstamo: S/ ${baseCap}`}
              </span>
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest border flex items-center gap-1.5 ${statusBadge}`}>
            {(isDanger || enVentanaAlerta) && <BellRing size={10} />}
            <span>{statusText}</span>
          </div>
        </div>

        {esEnReserva ? (
          <div className="bg-cyan-950/25 border border-cyan-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                Listo para Nuevo Préstamo (Negociable)
              </span>
              <div className="flex gap-1">
                {[600, 800, 900, 1000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleRenewCapPreset(val)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                      Number(renewCap) === val ? 'bg-cyan-400 text-black border-cyan-300' : 'bg-black/60 text-slate-300 border-white/10'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {isRenewing && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Capital Nuevo (S/)</label>
                  <input
                    type="number"
                    value={renewCap}
                    onChange={(e) => handleRenewCapPreset(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-cyan-500/40 text-white rounded-xl px-3 py-2 text-xs font-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nueva Cuota (S/)</label>
                  <input
                    type="number"
                    value={renewQuota}
                    onChange={(e) => setRenewQuota(e.target.value)}
                    className="w-full bg-black border border-emerald-500/40 text-emerald-300 rounded-xl px-3 py-2 text-xs font-black outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRenewing(!isRenewing)}
                className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase hover:bg-white/10"
              >
                {isRenewing ? 'Ocultar' : 'Ajustar Monto'}
              </button>
              <button
                type="button"
                onClick={() => onRenew && onRenew(loan, renewCap, renewQuota, 0)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Activar S/ {renewCap} (Cuota S/ {renewQuota})</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 bg-black/40 p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Abonado: S/ {pagado.toFixed(2)}</span>
                <span>Total Contrato: S/ {deudaOriginal.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full relative transition-all duration-1000 ease-out ${esFijo ? 'bg-purple-500' : porcentajeProgreso >= 100 ? 'bg-cyan-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${porcentajeProgreso}%` }}>
                </div>
              </div>
              <div className="flex justify-between items-center mt-1.5">
                 <span className="text-[9px] text-slate-500 font-bold uppercase">
                   {esFijo
                     ? (diasParaVencer > 0 ? `Faltan ${diasParaVencer} días para el pago` : diasParaVencer === 0 ? '¡Se paga hoy!' : `Vencido hace ${Math.abs(diasParaVencer)} días`)
                     : `${cuotasRestantes} días restantes (S/ ${loan.cuotaDiaria}/día)`}
                 </span>
                 <span className={`text-[10px] font-black tracking-wider ${esFijo ? 'text-purple-400' : 'text-emerald-400'}`}>
                   {porcentajeProgreso.toFixed(1)}% COMPLETADO
                 </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Falta para Cero</p>
                <p className="text-lg font-black text-white">S/ {loan.saldoPendiente}</p>
              </div>

              {esFijo ? (
                <div className={`bg-black/50 p-4 rounded-2xl border ${enVentanaAlerta ? 'border-amber-500/40' : 'border-purple-500/20'} relative overflow-hidden`}>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                    {diasParaVencer > 0 ? 'Juntar por Día' : 'Exigible Hoy'}
                  </p>
                  <p className={`text-xl font-black tracking-tight ${enVentanaAlerta ? 'text-amber-400' : 'text-purple-300'}`}>
                    <span>
                      S/ {diasParaVencer > 0 ? (loan.saldoPendiente / diasParaVencer).toFixed(2) : Number(loan.saldoPendiente).toFixed(2)}
                    </span>
                  </p>
                </div>
              ) : (
                <div className={`bg-black/50 p-4 rounded-2xl border ${isDanger ? 'border-rose-500/20' : 'border-white/5'} relative overflow-hidden`}>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Exigible Hoy</p>
                  <p className={`text-xl font-black tracking-tight ${isDanger ? 'text-rose-400' : (exigible > 0 ? 'text-amber-400' : 'text-slate-300')}`}>
                    <span>S/ {exigible.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>

            {estaCercaDeCero && (
              <div className="mb-4 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-cyan-300 uppercase block">
                    ⚡ Candidato a Ruleteo (A {cuotasRestantes} cuotas de cero)
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold">
                    Cancela S/ {loan.saldoPendiente} → Destraba S/ {baseCap}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onPayRequest(loan, loan.saldoPendiente)}
                  className="bg-cyan-400 hover:bg-cyan-300 text-black font-black text-[10px] px-3 py-2 rounded-xl uppercase tracking-wider"
                >
                  Liquidar a Cero
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-auto">
              <div className="flex gap-2 items-center">
                 {loan.yape && (
                   <button 
                     onClick={handleCopyYape}
                     className={`px-3 h-10 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-black transition-all ${
                       copied
                         ? 'bg-fuchsia-500 text-black border-fuchsia-400'
                         : 'bg-[#742284]/25 border-[#742284]/50 text-[#e598f7] hover:bg-[#742284]/40'
                     }`}
                   >
                     {copied ? <Check size={15} /> : <Copy size={15} />}
                     <span>{copied ? '¡Yape Copiado!' : 'Yape'}</span>
                   </button>
                 )}
                 {loan.telefono && (
                   <button 
                     onClick={handleWhatsApp}
                     className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${yaPagadoHoy ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'}`}
                   >
                     <MessageCircle size={18} />
                   </button>
                 )}
              </div>
              
              <button onClick={() => onPayRequest(loan, null)}
                className={`relative inline-flex items-center justify-center px-6 py-3.5 overflow-hidden font-black text-sm rounded-2xl transition-all
                  ${yaPagadoHoy 
                    ? 'bg-slate-900 text-amber-500 border border-amber-500/30' 
                    : esFijo
                    ? 'bg-purple-500 text-black'
                    : 'bg-emerald-500 text-black'}`}>
                <span className="relative z-10 flex items-center gap-2 tracking-wide">
                  {yaPagadoHoy ? <Lock size={16} /> : <Wallet size={16} />}
                  <span>{yaPagadoHoy ? 'LOCK' : esFijo ? 'LIQUIDAR / ABONAR' : 'EJECUTAR'}</span>
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODAL DE PAGO SIMPLIFICADO (YAPE PREFERENCIAL / PLIN / EFECTIVO + VOUCHER DE TEXTO ANTI-SPAM)
// ==========================================
function PaymentModal({ loan, initialAmount = null, autoCopiedInitial = false, onClose, onSubmit }) {
  const esFijo = loan.modalidad === 'FIJO';
  const defaultAmt = initialAmount !== null
    ? initialAmount
    : esFijo
    ? loan.saldoPendiente
    : (loan.montoExigible > 0 ? loan.montoExigible : loan.cuotaDiaria);

  const [amount, setAmount] = useState(defaultAmt.toString());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // YAPE por defecto (preferencial), también PLIN y EFECTIVO
  const [paymentMethod, setPaymentMethod] = useState('YAPE');
  const [nroOperacion, setNroOperacion] = useState('');
  const [yapeCopiedBanner, setYapeCopiedBanner] = useState(autoCopiedInitial || Boolean(loan.yape));
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidMethod, setPaidMethod] = useState('YAPE');
  const [paidOp, setPaidOp] = useState('');
  const [voucherTextoActual, setVoucherTextoActual] = useState('');
  const [copiedVoucherText, setCopiedVoucherText] = useState(false);

  const todayStr = getLocalTodayString();
  const requiresPassword = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;

  useEffect(() => {
    if (loan?.yape) {
      copyTextSafe(loan.yape);
      setYapeCopiedBanner(true);
    }
  }, [loan]);

  const handleManualCopyYape = () => {
    if (!loan.yape) return;
    copyTextSafe(loan.yape);
    setYapeCopiedBanner(true);
  };

  const construirNuevoMensajeVoucher = (montoPagado, metodoUsado, opUsada) => {
    const saldoActualizado = Math.max(0, loan.saldoPendiente - montoPagado);
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    return generarMensajeAntiSpam({
      prestamista: loan.prestamista,
      fechaStr,
      horaStr,
      montoAbono: montoPagado,
      saldoRestante: saldoActualizado,
      metodoPago: metodoUsado,
      nroOperacion: opUsada
    });
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return setError("Monto inválido detectado");
    if (numAmount > loan.saldoPendiente) return setError("Excede deuda máxima");
    if (requiresPassword && password !== 'KGB2026') return setError("ACCESO DENEGADO. Clave incorrecta.");
    
    const opLimpia = nroOperacion.trim();
    await onSubmit(loan.id, numAmount, paymentMethod, opLimpia);
    setPaidAmount(numAmount);
    setPaidMethod(paymentMethod);
    setPaidOp(opLimpia);
    setVoucherTextoActual(construirNuevoMensajeVoucher(numAmount, paymentMethod, opLimpia));
    setIsSuccess(true);
  };

  const handleCambiarVariacionMensaje = () => {
    setVoucherTextoActual(construirNuevoMensajeVoucher(paidAmount, paidMethod, paidOp));
  };

  const handleCopiarTextoVoucher = () => {
    copyTextSafe(voucherTextoActual);
    setCopiedVoucherText(true);
    setTimeout(() => setCopiedVoucherText(false), 2500);
  };

  const handleEnviarVoucherWhatsApp = () => {
    if (!loan.telefono) return;
    const urlSegura = `https://api.whatsapp.com/send?phone=51${loan.telefono}&text=${encodeURIComponent(voucherTextoActual)}`;
    window.open(urlSegura, '_blank');
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-[#0a0a0a] w-full max-w-sm rounded-[34px] border border-emerald-500/40 p-6 relative overflow-hidden flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CheckCircle size={22} className="text-emerald-400" />
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Pago Registrado</h3>
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                  Vía: {paidMethod} • S/ {paidAmount.toFixed(2)}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="bg-black/80 border border-white/10 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                Voucher del Día (Anti-Spam)
              </span>
              <button
                type="button"
                onClick={handleCambiarVariacionMensaje}
                className="text-[9px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-500/25 uppercase"
              >
                <RefreshCw size={11} />
                <span>Otro Mensaje</span>
              </button>
            </div>
            <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/5">
              {voucherTextoActual}
            </pre>
            <p className="text-[10px] text-amber-300/90 font-bold">
              💡 Al abrir WhatsApp se enviará este voucher y ahí mismo adjuntas tu pantallazo directo desde Yape.
            </p>
          </div>

          <div className="space-y-2.5">
            <button 
              onClick={handleEnviarVoucherWhatsApp} 
              className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(37,211,102,0.3)]"
            >
              <MessageCircle size={18} />
              <span>Enviar Voucher por WhatsApp a {loan.prestamista}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopiarTextoVoucher}
                className="bg-white/5 border border-white/10 text-slate-200 font-black py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all uppercase"
              >
                {copiedVoucherText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedVoucherText ? '¡Texto Copiado!' : 'Copiar Voucher'}</span>
              </button>
              <button
                onClick={onClose}
                className="bg-white/5 border border-white/10 text-slate-400 font-black py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 hover:text-white transition-all uppercase"
              >
                <span>Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] border border-white/10 p-6 sm:p-7 pb-10 sm:pb-7 relative overflow-y-auto max-h-[92dvh] [&::-webkit-scrollbar]:hidden">
        <div className="flex justify-between items-center mb-4 relative z-10">
          <h3 className="text-lg font-black text-white tracking-tighter uppercase">
            Pagar a: <span className="text-emerald-400">{loan.prestamista}</span>
          </h3>
          <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        {loan.yape ? (
          <div className="mb-4 p-3 rounded-2xl bg-[#742284]/25 border border-fuchsia-500/50 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500 text-black flex items-center justify-center font-black shrink-0">
                <Check size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300 block">
                  {yapeCopiedBanner ? '¡Nº Yape Copiado Automáticamente!' : 'Número Yape / Plin del Cobrador'}
                </span>
                <span className="text-sm font-black text-white tracking-wider">{loan.yape}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualCopyYape}
              className="px-2.5 py-2 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-[10px] font-black uppercase flex items-center gap-1"
            >
              <Copy size={12} />
              <span>Copiar</span>
            </button>
          </div>
        ) : null}
        
        {/* Selector de Vía de Pago: YAPE (Preferencial), PLIN o EFECTIVO */}
        <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
          <button
            type="button"
            onClick={() => setPaymentMethod('YAPE')}
            className={`py-2.5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 border transition-all ${
              paymentMethod === 'YAPE'
                ? 'bg-[#742284]/40 text-fuchsia-300 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.25)]'
                : 'bg-black/50 text-slate-500 border-white/5'
            }`}
          >
            <Smartphone size={14} />
            <span>YAPE ★</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('PLIN')}
            className={`py-2.5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 border transition-all ${
              paymentMethod === 'PLIN'
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400'
                : 'bg-black/50 text-slate-500 border-white/5'
            }`}
          >
            <Smartphone size={14} />
            <span>PLIN</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('EFECTIVO')}
            className={`py-2.5 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 border transition-all ${
              paymentMethod === 'EFECTIVO'
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400'
                : 'bg-black/50 text-slate-500 border-white/5'
            }`}
          >
            <Banknote size={14} />
            <span>EFECTIVO</span>
          </button>
        </div>

        <div className="space-y-4 mb-5 relative z-10">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">Monto a Registrar (S/)</label>
              <button
                type="button"
                onClick={() => setAmount(loan.saldoPendiente.toString())}
                className="text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-lg uppercase"
              >
                Cancelar al Cero (S/ {loan.saldoPendiente})
              </button>
            </div>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="w-full bg-black border-2 border-emerald-500/30 text-white rounded-2xl px-4 py-3 text-2xl font-black outline-none focus:border-emerald-400 text-center" />
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Nº de Operación (Opcional)</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={nroOperacion}
                onChange={(e) => setNroOperacion(e.target.value)}
                placeholder="Ej. 1492837"
                className="w-full bg-black/70 border border-white/10 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {requiresPassword && (
            <div>
              <label className="block text-[10px] font-bold text-rose-400 mb-1.5 flex items-center gap-2 uppercase">
                <Lock size={12} /> <span>Protocolo (KGB2026):</span>
              </label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black border-2 border-rose-500/40 text-white rounded-2xl px-4 py-3 text-lg text-center tracking-[0.5em] outline-none" />
            </div>
          )}
          {error && <p className="text-rose-400 text-xs font-bold text-center uppercase animate-pulse">{error}</p>}
        </div>

        <button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl text-sm tracking-widest uppercase transition-all">
           <span className="flex justify-center items-center gap-2">
             <span>Registrar Pago y Preparar Voucher</span>
             <CheckCircle size={18}/>
           </span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// PESTAÑA NUEVO CONTRATO
// ==========================================
function AddLoanTab({ onAdd }) {
  const [modalidad, setModalidad] = useState('DIARIO');
  const [prestamista, setPrestamista] = useState('');
  const [telefono, setTelefono] = useState('');
  const [yape, setYape] = useState('');
  const [capitalStr, setCapitalStr] = useState('');
  const [porcentajeStr, setPorcentajeStr] = useState('20'); 
  const [cuotaStr, setCuotaStr] = useState('');
  
  const [fechaInicioStr, setFechaInicioStr] = useState(getLocalTodayString());
  const [pagadoPrevioStr, setPagadoPrevioStr] = useState('');

  const [fechaVencimientoStr, setFechaVencimientoStr] = useState(addDaysToDateStr(getLocalTodayString(), 15));
  const [diasAlerta, setDiasAlerta] = useState(5);

  const [loading, setLoading] = useState(false);

  const capital = parseFloat(capitalStr) || 0;
  const porcentaje = parseFloat(porcentajeStr) || 0;
  const interes = capital * (porcentaje / 100);
  const deudaTotal = capital + interes;
  const cuota = parseFloat(cuotaStr) || 0;
  const pagadoPrevio = parseFloat(pagadoPrevioStr) || 0;

  const todayStr = getLocalTodayString();
  let diasTranscurridos = 0;
  
  if (modalidad === 'DIARIO' && fechaInicioStr && fechaInicioStr < todayStr) {
    let checkDate = addDaysToDateStr(fechaInicioStr, 1);
    while (checkDate <= todayStr) {
      if (getDayOfWeek(checkDate) !== 0) diasTranscurridos++;
      checkDate = addDaysToDateStr(checkDate, 1);
    }
  }
  
  const saldoActual = Math.max(0, deudaTotal - pagadoPrevio);
  const deudaHipotetica = diasTranscurridos * cuota;
  const diasParaVencerFijo = getDaysUntilDue(fechaVencimientoStr);
  const exigibleReal = modalidad === 'FIJO'
    ? (diasParaVencerFijo <= 0 ? saldoActual : 0)
    : Math.max(0, deudaHipotetica - pagadoPrevio);

  const handleCapitalChange = (val) => {
    setCapitalStr(val);
    const numCap = parseFloat(val) || 0;
    const numPorc = parseFloat(porcentajeStr) || 20;
    if (numCap > 0 && modalidad === 'DIARIO') {
      const total = numCap * (1 + numPorc / 100);
      setCuotaStr(Math.round(total / 24).toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prestamista || capital <= 0) return;
    if (modalidad === 'DIARIO' && cuota <= 0) return;
    if (modalidad === 'FIJO' && !fechaVencimientoStr) return;

    setLoading(true);

    const newLoan = {
      modalidad,
      prestamista, 
      telefono, 
      yape,
      capital, 
      cupoDisponible: capital,
      porcentajeInteres: porcentaje,
      interes, 
      deudaTotal, 
      cuotaDiaria: modalidad === 'FIJO' ? 0 : cuota,
      fechaVencimiento: modalidad === 'FIJO' ? fechaVencimientoStr : '',
      diasAlerta: modalidad === 'FIJO' ? diasAlerta : 0,
      saldoPendiente: saldoActual, 
      montoExigible: exigibleReal, 
      pagadoAcumulado: pagadoPrevio,
      fechaInicio: new Date(fechaInicioStr + 'T12:00:00').toISOString(),
      lastProcessedDate: todayStr,
      lastManualPaymentDate: null, 
      manualPaymentsCount: 0,
      ultimoPagoMonto: 0,
      yaMePrestoBloqueado: true
    };

    await onAdd(newLoan);
    setLoading(false);
    setPrestamista('');
    setTelefono('');
    setYape('');
    setCapitalStr('');
    setPorcentajeStr('20');
    setCuotaStr('');
    setFechaInicioStr(getLocalTodayString());
    setPagadoPrevioStr('');
  };

  return (
    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <h2 className="text-2xl font-black text-white mb-5 tracking-tighter uppercase">Generar Nuevo Préstamo</h2>
      
      <div className="grid grid-cols-2 gap-2.5 bg-slate-900/90 p-2 rounded-3xl border border-white/10 mb-5">
        <button
          type="button"
          onClick={() => setModalidad('DIARIO')}
          className={`py-3.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            modalidad === 'DIARIO'
              ? 'bg-emerald-500 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar size={15} />
          <span>Cobrador Diario</span>
        </button>

        <button
          type="button"
          onClick={() => setModalidad('FIJO')}
          className={`py-3.5 px-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            modalidad === 'FIJO'
              ? 'bg-gradient-to-r from-purple-500 to-amber-400 text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BellRing size={15} />
          <span>Prestamista Fijo</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-6 rounded-[32px] border border-white/10 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
              {modalidad === 'FIJO' ? 'Nombre del Prestamista Fijo' : 'Nombre del Cobrador Diario'}
            </label>
            <input type="text" value={prestamista} onChange={(e) => setPrestamista(e.target.value)} required className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500" placeholder="Ej. Liliana, Dayra, Gael..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Nº WhatsApp</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="999..." />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Nº Yape / Plin</label>
              <input type="tel" value={yape} onChange={(e) => setYape(e.target.value)} className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm font-bold outline-none" placeholder="999..." />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Capital Recibido (S/)</label>
              <input type="number" value={capitalStr} onChange={(e) => handleCapitalChange(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-emerald-400 rounded-2xl px-4 py-4 font-black outline-none text-lg" placeholder="500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Interés (%)</label>
              <input type="number" value={porcentajeStr} onChange={(e) => setPorcentajeStr(e.target.value)} required min="0" className="w-full bg-black/60 border border-white/10 text-rose-400 rounded-2xl px-4 py-4 font-black outline-none text-lg" placeholder="20" />
            </div>
          </div>

          {modalidad === 'DIARIO' ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Cuota Diaria (S/)</label>
              <input type="number" value={cuotaStr} onChange={(e) => setCuotaStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none" placeholder="25" />
            </div>
          ) : (
            <div className="bg-purple-950/25 border border-purple-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-purple-300 text-[10px] font-black uppercase tracking-widest">
                <CalendarClock size={15} className="text-amber-400" />
                <span>Configuración de Pago Único y Alerta</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1.5 uppercase">
                  ¿Qué día exacto tienes que pagarle todo?
                </label>
                <input
                  type="date"
                  value={fechaVencimientoStr}
                  onChange={(e) => setFechaVencimientoStr(e.target.value)}
                  required
                  className="w-full bg-black/70 border border-purple-500/40 text-white rounded-xl px-4 py-3 font-black text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-amber-300 mb-2 uppercase">
                  ¿Cuántos días antes quieres que te avise el Radar?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDiasAlerta(3)}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase border ${
                      diasAlerta === 3 ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/50 text-slate-400 border-white/10'
                    }`}
                  >
                    🔔 3 Días Antes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiasAlerta(5)}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase border ${
                      diasAlerta === 5 ? 'bg-amber-400 text-black border-amber-300' : 'bg-black/50 text-slate-400 border-white/10'
                    }`}
                  >
                    🔔 5 Días Antes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
             <Calendar size={14}/> {modalidad === 'FIJO' ? 'Fecha de Préstamo y Adelantos' : 'Sincronizar Nuevo Préstamo Actual'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Fecha de Entrega</label>
              <input type="date" value={fechaInicioStr} onChange={(e) => setFechaInicioStr(e.target.value)} required className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 font-bold outline-none text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase">Ya pagado (S/)</label>
              <input type="number" value={pagadoPrevioStr} onChange={(e) => setPagadoPrevioStr(e.target.value)} min="0" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 font-bold outline-none text-xs" placeholder="0" />
            </div>
          </div>
        </div>

        {capital > 0 && (
          <div className="bg-emerald-950/30 p-5 rounded-3xl border border-emerald-500/20 space-y-3 text-sm font-bold">
            <div className="flex justify-between text-slate-400"><span>BASE:</span> <span>S/ {capital.toFixed(2)}</span></div>
            <div className="flex justify-between text-rose-400"><span>INTERÉS (+{porcentaje}%):</span> <span>+ S/ {interes.toFixed(2)}</span></div>
            <div className="flex justify-between pt-3 border-t border-emerald-500/20 text-white text-base">
              <span>TOTAL A PAGAR:</span> 
              <span className="text-emerald-400">S/ {deudaTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-cyan-300 text-xs">
              <span>SALDO ACTUAL:</span>
              <span>S/ {saldoActual.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 uppercase tracking-widest">
          {loading ? <Loader2 size={20} className="animate-spin" /> : <span>Registrar Nuevo Préstamo Actual</span>}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// HISTORIAL POR COBRADOR (SIN GENERADOR DE HOJA DE IMAGEN)
// ==========================================
function HistoryTab({ logs, loans, onRevert, onDeleteReverted, onPurgeLenderHistory, onPurgeAllOldHistory }) {
  const listaCobradores = useMemo(() => {
    const nombresLoans = loans.map(l => l.prestamista).filter(Boolean);
    return [...new Set(nombresLoans)];
  }, [loans]);

  const [selectedCobrador, setSelectedCobrador] = useState('');
  const [purgingNotice, setPurgingNotice] = useState('');

  useEffect(() => {
    if (listaCobradores.length > 0 && (!selectedCobrador || !listaCobradores.includes(selectedCobrador))) {
      setSelectedCobrador(listaCobradores[0]);
    }
  }, [listaCobradores, selectedCobrador]);

  const loanActual = loans.find(l => l.prestamista === selectedCobrador);
  const esFijo = loanActual?.modalidad === 'FIJO';

  const logsDelCobrador = (logs || []).filter(
    log => (loanActual && log.loanId === loanActual.id) || log.prestamista === selectedCobrador
  );
  const pagosRegistrados = logsDelCobrador.filter(log => log.tipo === 'PAGO');
  const borradosRegistrados = logsDelCobrador.filter(log => log.tipo === 'REVERSO' || log.tipo === 'ELIMINACION');

  const cuotaDiaria = loanActual?.cuotaDiaria || 25;
  const deudaTotal = loanActual?.deudaTotal || 600;
  const totalCuotasContrato = esFijo ? 1 : (Math.max(1, Math.round(deudaTotal / cuotaDiaria)) || 24);
  
  const sumaLogsPagos = pagosRegistrados.reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalPagadoReal = loanActual ? (loanActual.pagadoAcumulado || 0) : sumaLogsPagos;
  const saldoPendienteReal = loanActual ? (loanActual.saldoPendiente || 0) : Math.max(0, deudaTotal - totalPagadoReal);

  const cuotasCompletas = esFijo ? (saldoPendienteReal <= 0 ? 1 : 0) : Math.floor((totalPagadoReal + 0.001) / cuotaDiaria);
  const residuoParcial = esFijo ? totalPagadoReal : Math.max(0, totalPagadoReal - (cuotasCompletas * cuotaDiaria));

  const pagosCronologicos = [...pagosRegistrados].reverse();

  const handleCleanCurrentLenderLogs = async () => {
    if (!selectedCobrador) return;
    await onPurgeLenderHistory(selectedCobrador, loanActual?.id || null);
    setPurgingNotice(`Historial anterior de ${selectedCobrador} limpiado.`);
    setTimeout(() => setPurgingNotice(''), 3000);
  };

  const handleCleanAllOrphanLogs = async () => {
    await onPurgeAllOldHistory(false);
    setPurgingNotice('Se borraron todos los préstamos antiguos que ya no están activos.');
    setTimeout(() => setPurgingNotice(''), 3000);
  };

  const handleReenviarVoucherPago = (log) => {
    if (!loanActual?.telefono) return;
    const fechaObj = new Date(log.fecha);
    const fechaStr = !isNaN(fechaObj.getTime())
      ? fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : getLocalTodayString();
    const horaStr = formatTime(log.fecha);

    const msg = generarMensajeAntiSpam({
      prestamista: selectedCobrador,
      fechaStr,
      horaStr,
      montoAbono: log.monto,
      saldoRestante: saldoPendienteReal,
      metodoPago: log.metodo || 'YAPE',
      nroOperacion: log.nroOperacion || ''
    });

    const url = `https://api.whatsapp.com/send?phone=51${loanActual.telefono}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (listaCobradores.length === 0) {
    return (
      <div className="text-center p-10 mt-10 relative z-10">
        <FileText className="mx-auto text-slate-700 mb-4" size={48} />
        <p className="text-slate-400 font-bold tracking-wide">Sin cobradores activos</p>
        <p className="text-slate-600 text-xs mt-2">Agrega tus préstamos actuales en NUEVO.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="mb-2 mt-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <User className="text-emerald-400" size={24} />
          <h2 className="text-xl font-black text-white tracking-tighter uppercase">Expediente Actual</h2>
        </div>
        <button
          type="button"
          onClick={handleCleanAllOrphanLogs}
          className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] font-black uppercase hover:bg-rose-500/25"
        >
          🧹 Purgar Préstamos Antiguos
        </button>
      </div>

      {purgingNotice && (
        <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-black text-center">
          {purgingNotice}
        </div>
      )}

      {/* Selector de Cobradores Actuales */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {listaCobradores.map(cobrador => {
          const isSelected = selectedCobrador === cobrador;
          return (
            <button
              key={cobrador}
              onClick={() => setSelectedCobrador(cobrador)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-black'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              <User size={14} />
              <span>{cobrador}</span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta Resumen del Cobrador */}
      <div className="bg-slate-900/80 border border-white/10 rounded-[28px] p-5 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
              {esFijo ? 'Prestamista Fijo (Pago Único)' : 'Ciclo Vigente del Cobrador'}
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">{selectedCobrador}</h3>
            {loanActual?.yape && (
              <span className="text-[10px] font-bold text-fuchsia-400 block mt-0.5">Yape / Plin: {loanActual.yape}</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
              {esFijo ? 'Vencimiento' : 'Avance Actual'}
            </span>
            <span className="text-lg font-black text-cyan-400">
              {esFijo
                ? (loanActual?.fechaVencimiento ? formatDate(loanActual.fechaVencimiento) : 'Pago Único')
                : `${Math.min(totalCuotasContrato, cuotasCompletas)} / ${totalCuotasContrato} DÍAS`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="bg-black/50 p-3 rounded-2xl border border-white/5">
            <p className="text-[9px] text-slate-500 font-bold uppercase">Deuda Total</p>
            <p className="text-sm font-black text-white mt-0.5">S/ {deudaTotal.toFixed(0)}</p>
          </div>
          <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-500/20">
            <p className="text-[9px] text-emerald-400/80 font-bold uppercase">Ya Pagado</p>
            <p className="text-sm font-black text-emerald-400 mt-0.5">S/ {totalPagadoReal.toFixed(2)}</p>
          </div>
          <div className="bg-rose-950/30 p-3 rounded-2xl border border-rose-500/20">
            <p className="text-[9px] text-rose-400/80 font-bold uppercase">Falta Pagar</p>
            <p className="text-sm font-black text-rose-400 mt-0.5">S/ {saldoPendienteReal.toFixed(2)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCleanCurrentLenderLogs}
          className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-rose-300 text-[10px] font-black uppercase"
        >
          🧹 Limpiar Pagos de Ciclo Viejo de {selectedCobrador}
        </button>
      </div>

      {/* Control Interno Visual de las 24 Cuotas */}
      {!esFijo && (
        <div className="bg-[#0a0a0a]/90 border border-white/10 rounded-[28px] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-cyan-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Control Interno: {totalCuotasContrato} Cuotas (S/ {cuotaDiaria} c/u)</h4>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">{Math.max(0, totalCuotasContrato - cuotasCompletas)} pendientes</span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: totalCuotasContrato }).map((_, idx) => {
              const numeroCuota = idx + 1;
              const isPaid = numeroCuota <= cuotasCompletas;
              const isPartial = numeroCuota === cuotasCompletas + 1 && residuoParcial > 0.01;

              return (
                <div
                  key={numeroCuota}
                  className={`relative rounded-xl p-2 flex flex-col items-center justify-center border transition-all ${
                    isPaid
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : isPartial
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse'
                      : 'bg-black/50 border-white/5 text-slate-600'
                  }`}
                >
                  <span className="text-[9px] font-black uppercase">Día {numeroCuota}</span>
                  {isPaid ? (
                    <CheckCircle size={14} className="text-emerald-400 my-1" />
                  ) : isPartial ? (
                    <Clock size={14} className="text-amber-400 my-1" />
                  ) : (
                    <span className="text-[10px] font-bold my-1 opacity-40">--</span>
                  )}
                  <span className="text-[8px] font-black">
                    {isPaid ? `S/${cuotaDiaria}` : isPartial ? `S/${residuoParcial.toFixed(0)}` : `S/${cuotaDiaria}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Pagos del Préstamo Actual */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
          Vouchers Registrados a {selectedCobrador} ({pagosRegistrados.length})
        </h4>

        {pagosCronologicos.length === 0 ? (
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-slate-500 text-xs font-bold">Sin pagos individuales registrados en este nuevo ciclo.</p>
          </div>
        ) : (
          [...pagosCronologicos].reverse().map((log, revIdx) => {
            const numeroAbono = pagosCronologicos.length - revIdx;
            const metodoTag = log.metodo === 'EFECTIVO' ? 'Efectivo' : log.metodo === 'PLIN' ? 'Plin' : 'Yape';
            const esEfectivo = metodoTag === 'Efectivo';
            const numYape = log.yapeAsociado || loanActual?.yape || '';

            return (
              <div key={log.id} className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      Abono #{numeroAbono}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase flex items-center gap-1 ${
                      esEfectivo ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
                    }`}>
                      {esEfectivo ? <Banknote size={10} /> : <Smartphone size={10} />}
                      {esEfectivo ? 'Efectivo' : `${metodoTag} ${numYape ? `(${numYape})` : ''}`}
                    </span>
                    {log.nroOperacion && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        Op. #{log.nroOperacion}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    {selectedCobrador} • {formatDate(log.fecha)} a las {formatTime(log.fecha)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-400">S/ {(log.monto || 0).toFixed(2)}</span>
                  {loanActual?.telefono && (
                    <button
                      onClick={() => handleReenviarVoucherPago(log)}
                      className="bg-green-500/15 text-green-400 p-2 rounded-xl border border-green-500/30 hover:bg-green-500/30"
                      title="Reenviar voucher de texto por WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => onRevert(log)}
                    className="bg-rose-500/10 text-rose-400 p-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/30"
                    title="Anular y revertir este pago"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* HISTORIAL DE BORRADOS / ANULADOS */}
      <div className="space-y-3 pt-3 border-t border-white/10">
        <h4 className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5 px-1">
          <RotateCcw size={14} />
          <span>Pagos Borrados / Anulados de {selectedCobrador} ({borradosRegistrados.length})</span>
        </h4>

        {borradosRegistrados.length === 0 ? (
          <div className="text-center p-4 bg-white/[0.02] rounded-2xl border border-white/5">
            <p className="text-slate-600 text-[11px] font-bold">No hay pagos borrados o anulados para {selectedCobrador}.</p>
          </div>
        ) : (
          borradosRegistrados.map((log) => {
            const metodoTag = log.metodo === 'EFECTIVO' ? 'Efectivo' : log.metodo === 'PLIN' ? 'Plin' : 'Yape';
            const esEfectivo = metodoTag === 'Efectivo';
            const numYape = log.yapeAsociado || loanActual?.yape || '';

            return (
              <div key={log.id} className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      BORRADO / ANULADO
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 uppercase flex items-center gap-1">
                      {esEfectivo ? <Banknote size={10} /> : <Smartphone size={10} />}
                      {esEfectivo ? 'Efectivo' : `${metodoTag} ${numYape ? `(${numYape})` : ''}`}
                    </span>
                  </div>
                  <p className="text-xs font-black text-white">Cobrador: {log.prestamista}</p>
                  <p className="text-[11px] font-bold text-slate-400">
                    Fecha: {formatDate(log.fecha)} • Hora: {formatTime(log.fecha)}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-rose-400 line-through">
                    S/ {Number(log.monto || 0).toFixed(2)}
                  </span>
                  {onDeleteReverted && (
                    <button
                      onClick={() => onDeleteReverted(log.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InsightsTab({ stats }) {
  const total = stats.totalDeuda > 0 ? stats.totalDeuda : 1; 
  const porcCapital = (stats.totalCapital / total) * 100;
  const porcInteres = (stats.totalIntereses / total) * 100;

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="mb-8 mt-2 flex items-center gap-3">
         <PieChart className="text-amber-400" size={24} />
         <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Telemetría</h2>
      </div>

      <div className="bg-rose-950/20 p-8 rounded-[32px] border border-rose-500/20 relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-6 text-rose-400">
          <TrendingUp size={24} />
          <h3 className="font-black text-xs uppercase tracking-widest">Fuga de Capital (Intereses)</h3>
        </div>
        <p className="text-5xl font-black text-white mb-2 tracking-tighter">S/ {stats.totalIntereses.toFixed(2)}</p>
        <p className="text-xs text-rose-300/60 mb-8 font-bold uppercase tracking-widest">Penalización acumulada del sistema</p>
        
        <div className="w-full h-4 bg-black/50 rounded-full flex overflow-hidden mb-4 border border-white/5">
          <div className="bg-cyan-500 h-full" style={{ width: `${porcCapital}%` }}></div>
          <div className="bg-rose-500 h-full" style={{ width: `${porcInteres}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className="text-cyan-400">Capital S/ {stats.totalCapital.toFixed(0)}</span>
          <span className="text-rose-400">Interés S/ {stats.totalIntereses.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick, badge = 0 }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 h-12 gap-1 transition-all duration-300 relative ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      {isActive && <div className="absolute inset-0 bg-white/10 rounded-2xl"></div>}
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400' : ''}`}>
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-amber-400 text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className={`relative z-10 text-[7px] sm:text-[8px] uppercase tracking-widest ${isActive ? 'font-black text-cyan-100' : 'font-bold'}`}>{label}</span>
    </button>
  );
}