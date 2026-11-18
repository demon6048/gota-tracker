import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, PlusCircle, PieChart, Wallet, Calendar, 
  CheckCircle, TrendingUp, Edit2, 
  Save, X, Loader2, Lock, AlertCircle, Trash2,
  Zap, ShieldAlert, Wifi, WifiOff, Loader,
  MessageCircle, Copy, Check, History, Clock, FileText,
  Banknote, Smartphone, User, LayoutGrid, Image as ImageIcon,
  Download, Share2, Upload, Calculator, ArrowRight, Hash, Sparkles
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

// ==========================================
// MOTOR ANTI-SPAM DE WHATSAPP (22 VARIACIONES + Nº OPERACIÓN)
// ==========================================
const generarMensajeAntiSpam = ({ prestamista, fechaStr, horaStr, montoAbono, saldoRestante, metodoPago, nroOperacion, cuotasCubiertas, totalCuotas }) => {
  const esEfectivo = metodoPago === 'EFECTIVO';
  const viaTexto = esEfectivo ? 'en efectivo (mano a mano)' : 'por billetera digital (Yape)';
  const monto = Number(montoAbono || 0).toFixed(2);
  const saldo = Number(saldoRestante || 0).toFixed(2);
  const lineaOp = nroOperacion ? `\n\uD83D\uDD22 N\u00BA Operaci\u00F3n: ${nroOperacion}` : '';
  const lineaProgreso = (cuotasCubiertas !== undefined && totalCuotas) ? `\n\uD83D\uDCCA Progreso: ${cuotasCubiertas}/${totalCuotas} cuotas` : '';

  const plantillas = [
    () => `\uD83E\uDD1D Hola ${prestamista}, adjunto mi comprobante del pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}${lineaProgreso}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDC4B Qu\u00E9 tal ${prestamista}, paso a dejarte la constancia del abono de hoy realizado ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2705 Monto pagado: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Resta por pagar: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDE4C \u00A1Que tengas excelente d\u00EDa!`,
    () => `\u2728 Buen d\u00EDa ${prestamista}, ya qued\u00F3 listo el pago correspondiente a hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora exacta: ${horaStr}\n\uD83D\uDCB5 Cuota abonada: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Saldo pendiente: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Muchas gracias!`,
    () => `\uD83D\uDCF2 Saludos ${prestamista}, te comparto el detalle de la cuota pagada el d\u00EDa de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Importe: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Nuevo saldo: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDC4D \u00A1Seguimos al d\u00EDa!`,
    () => `\u2705 Hola ${prestamista}, cumpliendo con el abono del d\u00EDa ${viaTexto}. Aqu\u00ED los datos:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Abonado hoy: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Cuenta restante: S/ ${saldo}${lineaProgreso}\n\n\uD83C\uDF1F \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDCBC Estimado ${prestamista}, te env\u00EDo el respaldo de la operaci\u00F3n de hoy efectuada ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Pago: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo actual: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Saludos cordiales!`,
    () => `\uD83D\uDE80 Hola ${prestamista}, acabo de realizar el pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2714\uFE0F Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Queda pendiente: S/ ${saldo}${lineaProgreso}\n\n\u2728 \u00A1Gracias por confirmar!`,
    () => `\uD83D\uDC4B Buenas ${prestamista}, te confirmo que ya se hizo el dep\u00F3sito de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB5 Monto enviado: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo restante: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDE4C \u00A1Saludos!`,
    () => `\uD83E\uDDFE Qu\u00E9 tal ${prestamista}, aqu\u00ED tienes el reporte del abono que acabo de hacer ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Valor abonado: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Por cancelar: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDC4D \u00A1Buen d\u00EDa!`,
    () => `\u26A1 Hola ${prestamista}, listo el pago de la fecha ${viaTexto}. Te dejo el resumen:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\u2705 Cuota: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo a la fecha: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Nos vemos!`,
    () => `\uD83D\uDCF1 Hola ${prestamista}, te hago llegar los datos de la transferencia de hoy ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCB8 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Resta: S/ ${saldo}${lineaProgreso}\n\n\u2728 \u00A1Excelente jornada!`,
    () => `\uD83D\uDCDD Qu\u00E9 tal ${prestamista}, registrando la cuota cumplida del d\u00EDa de hoy ${viaTexto}:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono del d\u00EDa: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDE4C \u00A1Muchas gracias!`,
    () => `\uD83D\uDD14 Hola ${prestamista}, ya est\u00E1 procesado el abono de hoy ${viaTexto}. Detalles:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\u2705 Pago: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Saldo pendiente: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDC4D \u00A1Saludos!`,
    () => `\uD83C\uDF1F Saludos ${prestamista}, te env\u00EDo la constancia del pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCB5 Abonado: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Restante: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Quedo atento!`,
    () => `\uD83D\uDC4B Hola ${prestamista}, te actualizo con el abono realizado hace un momento ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo actual: S/ ${saldo}${lineaProgreso}\n\n\u2728 \u00A1Buen d\u00EDa!`,
    () => `\u2705 Buenas ${prestamista}, cumpliendo puntual con el pago de hoy ${viaTexto}:\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Cuota pagada: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Nuevo saldo: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDE4C \u00A1Saludos!`,
    () => `\uD83D\uDCB3 Hola ${prestamista}, te dejo la constancia de la cuota abonada hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2714\uFE0F Abono: S/ ${monto}${lineaOp}\n\uD83D\uDCC9 Saldo por pagar: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDC4D \u00A1Gracias!`,
    () => `\uD83D\uDE80 Qu\u00E9 tal ${prestamista}, pago efectuado con \u00E9xito hoy ${viaTexto}. Aqu\u00ED el detalle:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB5 Importe: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}${lineaProgreso}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDCCA Hola ${prestamista}, te comparto la actualizaci\u00F3n de cuenta con el pago de hoy ${viaTexto}.\n\n\uD83D\uDCC5 D\u00EDa: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Abono: S/ ${monto}${lineaOp}\n\uD83E\uDDFE Queda restando: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDC4B Saludos ${prestamista}, ya se hizo efectivo el abono del d\u00EDa ${viaTexto}.\n\n\uD83D\uDDD3\uFE0F Fecha: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\u2705 Monto: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Saldo pendiente: S/ ${saldo}${lineaProgreso}\n\n\uD83C\uDF1F \u00A1Muchas gracias!`,
    () => `\uD83D\uDCF2 Hola ${prestamista}, adjunto la informaci\u00F3n del pago que acabo de realizar ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB8 Pago hoy: S/ ${monto}${lineaOp}\n\uD83D\uDCB0 Resta: S/ ${saldo}${lineaProgreso}\n\n\uD83D\uDC4D \u00A1Excelente d\u00EDa!`,
    () => `\uD83E\uDDFE Qu\u00E9 tal ${prestamista}, te env\u00EDo el ticket digital del abono de hoy ${viaTexto}.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB3 Cuota abonada: S/ ${monto}${lineaOp}\n\uD83D\uDCCA Saldo restante: S/ ${saldo}${lineaProgreso}\n\n\uD83E\uDD1D \u00A1Saludos!`
  ];

  const indiceAleatorio = Math.floor(Math.random() * plantillas.length);
  return plantillas[indiceAleatorio]();
};

const generarEstadoCuentaAntiSpam = ({ prestamista, fechaStr, horaStr, saldoRestante, exigible }) => {
  const saldo = Number(saldoRestante || 0).toFixed(2);
  const mora = Number(exigible || 0).toFixed(2);

  const plantillasEstado = [
    () => `\uD83E\uDD1D Hola ${prestamista}, te comparto el resumen actualizado de nuestra cuenta al d\u00EDa de hoy.\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB0 Saldo restante: S/ ${saldo}\n\u26A0\uFE0F Exigible hoy: S/ ${mora}\n\n\u2728 \u00A1Saludos!`,
    () => `\uD83D\uDC4B Qu\u00E9 tal ${prestamista}, paso a enviarte el estado de cuenta actualizado:\n\n\uD83D\uDDD3\uFE0F D\u00EDa: ${fechaStr}\n\uD83D\uDD52 Hora: ${horaStr}\n\uD83D\uDCCA Por pagar: S/ ${saldo}\n\uD83D\uDD14 Cuota pendiente: S/ ${mora}\n\n\uD83D\uDE4C \u00A1Buen d\u00EDa!`,
    () => `\uD83D\uDCDD Saludos ${prestamista}, as\u00ED va el avance de la cuenta hasta este momento:\n\n\uD83D\uDCC5 Fecha: ${fechaStr}\n\u23F0 Hora: ${horaStr}\n\uD83D\uDCB0 Resta total: S/ ${saldo}\n\uD83D\uDCB3 Exigible actual: S/ ${mora}\n\n\uD83D\uDC4D \u00A1Seguimos en contacto!`
  ];

  const idx = Math.floor(Math.random() * plantillasEstado.length);
  return plantillasEstado[idx]();
};

// ==========================================
// GENERADOR DE TICKET EN IMAGEN (CANVAS 24 CASILLAS + VOUCHER)
// ==========================================
const dibujarRectanguloRedondeado = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const renderTicketCanvas = async (canvas, {
  prestamista,
  fechaStr,
  horaStr,
  montoAbono,
  deudaTotal,
  totalPagado,
  saldoRestante,
  cuotaDiaria,
  metodoPago,
  nroOperacion,
  voucherDataUrl
}) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const totalCuotas = Math.max(1, Math.round((deudaTotal || 600) / (cuotaDiaria || 25))) || 24;
  const cols = 6;
  const rows = Math.ceil(totalCuotas / cols);

  const extraVoucherHeight = voucherDataUrl ? 340 : 0;
  const width = 720;
  const height = 660 + (rows * 74) + extraVoucherHeight;

  canvas.width = width;
  canvas.height = height;

  // Fondo Principal Oscuro Futurista
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#040914');
  bgGrad.addColorStop(0.5, '#070b12');
  bgGrad.addColorStop(1, '#030508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Halo Neón Superior
  const radialGrad = ctx.createRadialGradient(width / 2, 70, 10, width / 2, 70, 320);
  radialGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
  radialGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = radialGrad;
  ctx.fillRect(0, 0, width, 350);

  // Marco Exterior del Ticket
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
  ctx.lineWidth = 2;
  dibujarRectanguloRedondeado(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  // Encabezado
  ctx.fillStyle = '#10b981';
  ctx.font = '900 15px sans-serif';
  ctx.fillText('GOTATRACKER // COMPROBANTE & CONTROL DE CUOTAS', 56, 68);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(`COBRADOR: ${String(prestamista || '').toUpperCase()}`, 56, 112);

  // Etiqueta Fecha y Hora
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`FECHA: ${fechaStr}   •   HORA: ${horaStr}`, 56, 144);

  // Badge de Método y Nº de Operación
  const viaLabel = metodoPago === 'EFECTIVO' ? 'VÍA: EFECTIVO MANO A MANO' : 'VÍA: YAPE / BILLETERA DIGITAL';
  const opLabel = nroOperacion ? `   •   OPERACIÓN #${nroOperacion}` : '';
  ctx.fillStyle = 'rgba(6, 182, 212, 0.14)';
  dibujarRectanguloRedondeado(ctx, 56, 162, width - 112, 44, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#22d3ee';
  ctx.font = '900 15px sans-serif';
  ctx.fillText(`${viaLabel}${opLabel}`, 74, 190);

  // Caja Principal: Abono Registrado Hoy
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  dibujarRectanguloRedondeado(ctx, 56, 224, width - 112, 110, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(montoAbono > 0 ? 'MONTO ABONADO EN ESTA TRANSACCIÓN' : 'ESTADO DE CUENTA ACTUALIZADO', 80, 255);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 44px sans-serif';
  ctx.fillText(montoAbono > 0 ? `S/ ${Number(montoAbono).toFixed(2)}` : `CUOTA S/ ${Number(cuotaDiaria).toFixed(2)}`, 80, 308);

  // 3 Cajas Financieras: Deuda Total | Total Pagado | Saldo Restante
  const boxY = 354;
  const boxW = (width - 112 - 24) / 3;
  const metricas = [
    { label: 'DEUDA CONTRATO', val: `S/ ${Number(deudaTotal || 0).toFixed(2)}`, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: '#ffffff' },
    { label: 'ACUMULADO PAGADO', val: `S/ ${Number(totalPagado || 0).toFixed(2)}`, bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)', color: '#34d399' },
    { label: 'SALDO RESTANTE', val: `S/ ${Number(saldoRestante || 0).toFixed(2)}`, bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.35)', color: '#fb7185' }
  ];

  metricas.forEach((m, idx) => {
    const x = 56 + idx * (boxW + 12);
    ctx.fillStyle = m.bg;
    dibujarRectanguloRedondeado(ctx, x, boxY, boxW, 86, 16);
    ctx.fill();
    ctx.strokeStyle = m.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(m.label, x + 16, boxY + 28);

    ctx.fillStyle = m.color;
    ctx.font = '900 22px sans-serif';
    ctx.fillText(m.val, x + 16, boxY + 64);
  });

  // Título de la Cartilla de 24 Cuotas
  const cuotasCompletas = Math.floor((Number(totalPagado || 0) + 0.001) / (cuotaDiaria || 25));
  const residuoParcial = Math.max(0, Number(totalPagado || 0) - (cuotasCompletas * (cuotaDiaria || 25)));

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '900 16px sans-serif';
  ctx.fillText(`CARTILLA DE ${totalCuotas} CUOTAS (S/ ${cuotaDiaria} C/U)   —   ${Math.min(totalCuotas, cuotasCompletas)}/${totalCuotas} COMPLETADAS`, 56, 480);

  // Dibujar Grilla de 24 Casillas
  const gridStartY = 502;
  const cellGap = 10;
  const cellW = (width - 112 - (cellGap * (cols - 1))) / cols;
  const cellH = 62;

  for (let i = 0; i < totalCuotas; i++) {
    const num = i + 1;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 56 + col * (cellW + cellGap);
    const y = gridStartY + row * (cellH + cellGap);

    const isPaid = num <= cuotasCompletas;
    const isPartial = num === cuotasCompletas + 1 && residuoParcial > 0.01;

    if (isPaid) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.strokeStyle = '#10b981';
    } else if (isPartial) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.strokeStyle = '#f59e0b';
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    }

    dibujarRectanguloRedondeado(ctx, x, y, cellW, cellH, 12);
    ctx.fill();
    ctx.lineWidth = isPaid || isPartial ? 1.8 : 1;
    ctx.stroke();

    ctx.fillStyle = isPaid ? '#6ee7b7' : isPartial ? '#fcd34d' : '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`DÍA ${num}`, x + 12, y + 20);

    ctx.fillStyle = isPaid ? '#ffffff' : isPartial ? '#fef08a' : '#475569';
    ctx.font = '900 14px sans-serif';
    const textoCasilla = isPaid ? `✓ S/${cuotaDiaria}` : isPartial ? `S/${residuoParcial.toFixed(0)}` : `S/${cuotaDiaria}`;
    ctx.fillText(textoCasilla, x + 12, y + 46);
  }

  let footerY = gridStartY + rows * (cellH + cellGap) + 25;

  // Si el usuario adjuntó la captura del Yape al programa, incrustarla en el ticket
  if (voucherDataUrl) {
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        dibujarRectanguloRedondeado(ctx, 56, footerY, width - 112, 300, 18);
        ctx.fill();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.font = '900 13px sans-serif';
        ctx.fillText('CAPTURA DE YAPE / VOUCHER VERIFICADO EN SISTEMA:', 76, footerY + 28);

        const maxW = width - 152;
        const maxH = 245;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const drawW = img.width * ratio;
        const drawH = img.height * ratio;
        const drawX = 56 + ((width - 112) - drawW) / 2;
        const drawY = footerY + 42;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        footerY += 325;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = voucherDataUrl;
    });
  }

  // Pie de Ticket
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('VERIFICADO POR GOTATRACKER 2026 • SINCRONIZACIÓN EN TIEMPO REAL', 56, height - 42);
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

        // Lógica de Mora Automática
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
  const logActivity = async (tipo, prestamista, descripcion, monto = 0, loanId = null, metodo = 'DIGITAL', nroOperacion = '') => {
    try {
      await addDoc(collection(db, coleccionHistorial), {
        tipo,
        prestamista,
        descripcion,
        monto,
        loanId,
        metodo,
        nroOperacion,
        fecha: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error al guardar en historial:", error);
    }
  };

  // --- Handlers DB ---
  const executePayment = async (loanId, amountPaid, paymentMethod = 'DIGITAL', nroOperacion = '') => {
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
        ultimoPagoMonto: amountPaid,
        ultimoPagoMetodo: paymentMethod,
        ultimoNroOperacion: nroOperacion || ''
      });

      const opInfo = nroOperacion ? ` (Op. #${nroOperacion})` : '';
      await logActivity('PAGO', loan.prestamista, `Abono en ${paymentMethod.toLowerCase()} a favor de ${loan.prestamista}${opInfo}`, amountPaid, loan.id, paymentMethod, nroOperacion);
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setFirebaseStatus('error');
    }
  };

  const handleEdit = async (id, prestamista, telefono, yape, nuevoSaldo, nuevaCuota, nuevoExigible, nuevaFecha) => {
    if (!user) return;
    try {
      const loan = loans.find(l => l.id === id);
      const deudaTotal = loan?.deudaTotal || 0;
      const saldoNum = parseFloat(nuevoSaldo) || 0;
      const nuevoPagadoAcumulado = Math.max(0, deudaTotal - saldoNum);

      const loanDoc = doc(db, coleccionGlobal, id);
      await updateDoc(loanDoc, {
        prestamista: prestamista || '',
        telefono: telefono || '',
        yape: yape || '',
        saldoPendiente: saldoNum,
        pagadoAcumulado: nuevoPagadoAcumulado,
        cuotaDiaria: parseFloat(nuevaCuota) || 0,
        montoExigible: parseFloat(nuevoExigible) || 0,
        fechaInicio: new Date(nuevaFecha + 'T12:00:00').toISOString()
      });
      if(loan) await logActivity('EDICION', prestamista || loan.prestamista, `Parámetros modificados manualmente`, 0, id);
    } catch (error) {
      console.error("Error al editar:", error);
      setFirebaseStatus('error');
    }
  };

  const handleAddLoan = async (newLoan) => {
    if (!user) return;
    try {
      const loansRef = collection(db, coleccionGlobal);
      const docRef = await addDoc(loansRef, newLoan);
      
      await logActivity('NUEVO', newLoan.prestamista, `Se inyectó un nuevo préstamo a ${newLoan.prestamista}`, newLoan.capital, docRef.id);
      
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
        await logActivity('ELIMINACION', loan.prestamista, `Se eliminó por completo el contrato de ${loan.prestamista}`, 0, id);
      }
      
      const loanDoc = doc(db, coleccionGlobal, id);
      await deleteDoc(loanDoc);
    } catch (error) {
      console.error("Error al eliminar:", error);
      setFirebaseStatus('error');
    }
  };

  // --- MOTOR DE REVERSA ---
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

      await deleteDoc(doc(db, coleccionHistorial, log.id));
      await logActivity('REVERSO', log.prestamista, `Reversión de pago erróneo (-S/ ${log.monto.toFixed(2)})`, log.monto, log.loanId);
      
    } catch (error) {
      console.error("Error al revertir pago:", error);
    }
  };

  // Abrir modal de pago (opcionalmente con un monto precalculado por Caja del Día)
  const openPaymentWithAmount = (loan, customAmount = null) => {
    setPaymentModalData({ loan, customAmount });
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
        <main className="flex-1 overflow-y-auto p-4 pb-28 relative z-10 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeTab === 'dashboard' && <DashboardTab loans={loans} stats={stats} onPayRequest={openPaymentWithAmount} onEdit={handleEdit} onDelete={handleDelete} />}
          {activeTab === 'add' && <AddLoanTab onAdd={handleAddLoan} />}
          {activeTab === 'history' && <HistoryTab logs={historyLogs} loans={loans} onRevert={handleRevertLog} />}
          {activeTab === 'insights' && <InsightsTab stats={stats} loans={loans} />}
        </main>

        {/* Bottom Nav compacta y estática */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none z-30 flex justify-center bg-gradient-to-t from-black/80 to-transparent pt-8">
          <nav className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 flex justify-around p-1.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full max-w-[380px]">
            <NavItem icon={<Home size={18} />} label="Panel" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<PlusCircle size={18} />} label="Nuevo" isActive={activeTab === 'add'} onClick={() => setActiveTab('add')} />
            <NavItem icon={<History size={18} />} label="Cobrador" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <NavItem icon={<PieChart size={18} />} label="Datos" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
          </nav>
        </div>

        {paymentModalData && (
          <PaymentModal 
            loan={paymentModalData.loan} 
            initialAmount={paymentModalData.customAmount}
            onClose={() => setPaymentModalData(null)} 
            onSubmit={executePayment} 
          />
        )}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO CAJA DEL DÍA (DISTRIBUIDOR DE RUTA DE PAGOS)
// ==========================================
function DailyCashBox({ loans, stats, onPayWithAmount }) {
  const [isOpen, setIsOpen] = useState(false);
  const [presupuestoStr, setPresupuestoStr] = useState('');

  const activeLoans = loans.filter(l => (l.saldoPendiente || 0) > 0);
  const todayStr = getLocalTodayString();

  // Préstamos que aún requieren pago hoy
  const pendientesHoy = useMemo(() => {
    return activeLoans
      .filter(l => !(l.lastManualPaymentDate === todayStr && (l.manualPaymentsCount || 0) >= 1))
      .sort((a, b) => {
        // Prioridad 1: Mayor mora respecto a su cuota
        const moraA = (a.montoExigible || 0) - (a.cuotaDiaria || 0);
        const moraB = (b.montoExigible || 0) - (b.cuotaDiaria || 0);
        if (moraB !== moraA) return moraB - moraA;
        // Prioridad 2: Mayor monto exigible
        return (b.montoExigible || 0) - (a.montoExigible || 0);
      });
  }, [activeLoans, todayStr]);

  const totalCuotasPendientesHoy = pendientesHoy.reduce((acc, l) => acc + Math.min(l.cuotaDiaria || 0, l.saldoPendiente || 0), 0);
  const totalExigiblePendienteHoy = pendientesHoy.reduce((acc, l) => acc + ((l.montoExigible || 0) > 0 ? l.montoExigible : Math.min(l.cuotaDiaria || 0, l.saldoPendiente || 0)), 0);

  const presupuesto = parseFloat(presupuestoStr) || 0;

  // Algoritmo de distribución inteligente
  const planDistribucion = useMemo(() => {
    if (presupuesto <= 0) return { asignaciones: [], sobrante: 0 };
    let disponible = presupuesto;
    const asignaciones = [];

    // Paso 1: Cubrir al menos la cuota del día en orden de prioridad
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

    // Paso 2: Si sobra dinero y alguien tiene mora atrasada extra, cubrir su mora
    if (disponible > 0) {
      for (let item of asignaciones) {
        if (disponible <= 0) break;
        const exigibleExtra = Math.max(0, (item.loan.montoExigible || 0) - item.montoAsignado);
        if (exigibleExtra > 0) {
          const extra = Math.min(disponible, exigibleExtra, item.loan.saldoPendiente - item.montoAsignado);
          item.montoAsignado += extra;
          disponible -= extra;
          if ( extra > 0 ) item.estado = 'CUBRE_MORA';
        }
      }
    }

    return { asignaciones, sobrante: disponible };
  }, [presupuesto, pendientesHoy]);

  if (activeLoans.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/30 border border-emerald-500/30 rounded-[28px] p-4 shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Calculator size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Caja del Día</h3>
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
                placeholder="Ej. 50"
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
              <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">¡Todos los cobradores de hoy ya fueron pagados!</p>
            </div>
          ) : presupuesto > 0 ? (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1">
                <span className="text-slate-400">Ruta Sugerida por Prioridad:</span>
                {planDistribucion.sobrante > 0 ? (
                  <span className="text-cyan-400">Te sobran: S/ {planDistribucion.sobrante.toFixed(2)}</span>
                ) : presupuesto < totalCuotasPendientesHoy ? (
                  <span className="text-rose-400">Faltan: S/ {(totalCuotasPendientesHoy - presupuesto).toFixed(2)}</span>
                ) : (
                  <span className="text-emerald-400">Caja Exacta</span>
                )}
              </div>

              {planDistribucion.asignaciones.map(({ loan, montoAsignado, estado }) => (
                <div key={loan.id} className="bg-black/60 border border-white/10 p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
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

                  {montoAsignado > 0 ? (
                    <button
                      onClick={() => onPayWithAmount(loan, montoAsignado)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
                    >
                      <span>Pagar S/ {montoAsignado.toFixed(0)}</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <span className="text-[10px] font-black text-rose-400/70 uppercase px-2">Pendiente</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 text-center italic">
              Escribe arriba cuánto efectivo o saldo Yape tienes hoy para armar tu ruta automática.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Componentes Secundarios ---

function DashboardTab({ loans, stats, onPayRequest, onEdit, onDelete }) {
  const activeLoans = loans.filter(l => (l.saldoPendiente || 0) > 0);
  
  return (
    <div className="space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Módulo de Caja del Día */}
      <DailyCashBox loans={loans} stats={stats} onPayWithAmount={onPayRequest} />

      <div className="flex justify-between items-center px-2 mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Activos ({activeLoans.length})</h3>
      </div>
      <div className="space-y-5">
        {activeLoans.map(loan => (
          <LoanCard key={loan.id} loan={loan} onPayRequest={(l) => onPayRequest(l, null)} onEdit={onEdit} onDelete={onDelete} />
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
  
  const [editPrestamista, setEditPrestamista] = useState(loan.prestamista || '');
  const [editWhatsApp, setEditWhatsApp] = useState(loan.telefono || '');
  const [editYape, setEditYape] = useState(loan.yape || '');
  const [editSaldo, setEditSaldo] = useState((loan.saldoPendiente || 0).toString());
  const [editCuota, setEditCuota] = useState((loan.cuotaDiaria || 0).toString());
  const [editExigible, setEditExigible] = useState((loan.montoExigible || 0).toString());
  const initialDateStr = loan.fechaInicio ? loan.fechaInicio.split('T')[0] : getLocalTodayString();
  const [editFechaInicio, setEditFechaInicio] = useState(initialDateStr);

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
    
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const totalCuotas = Math.max(1, Math.round(deudaOriginal / cuotaSegura)) || 24;
    const cuotasCubiertas = Math.floor((pagado + 0.001) / cuotaSegura);

    let mensajePlano = '';
    if (yaPagadoHoy && loan.ultimoPagoMonto) {
      mensajePlano = generarMensajeAntiSpam({
        prestamista: loan.prestamista,
        fechaStr,
        horaStr,
        montoAbono: loan.ultimoPagoMonto,
        saldoRestante: loan.saldoPendiente,
        metodoPago: loan.ultimoPagoMetodo || 'DIGITAL',
        nroOperacion: loan.ultimoNroOperacion || '',
        cuotasCubiertas,
        totalCuotas
      });
    } else {
      mensajePlano = generarEstadoCuentaAntiSpam({
        prestamista: loan.prestamista,
        fechaStr,
        horaStr,
        saldoRestante: loan.saldoPendiente,
        exigible
      });
    }
    
    const urlSegura = `https://api.whatsapp.com/send?phone=51${loan.telefono}&text=${encodeURIComponent(mensajePlano)}`;
    window.open(urlSegura, '_blank');
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
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Prestamista</label>
            <input type="text" value={editPrestamista} onChange={(e) => setEditPrestamista(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">WhatsApp</label>
              <input type="tel" value={editWhatsApp} onChange={(e) => setEditWhatsApp(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Yape</label>
              <input type="tel" value={editYape} onChange={(e) => setEditYape(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Deuda Restante</label>
               <input type="number" value={editSaldo} onChange={(e) => setEditSaldo(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Monto Exigible</label>
               <input type="number" value={editExigible} onChange={(e) => setEditExigible(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Cuota Diaria (S/)</label>
              <input type="number" value={editCuota} onChange={(e) => setEditCuota(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-sm focus:border-cyan-500 outline-none shadow-inner font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Día de Entrega</label>
              <input type="date" value={editFechaInicio} onChange={(e) => setEditFechaInicio(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white rounded-2xl px-4 py-3 text-[11px] focus:border-cyan-500 outline-none shadow-inner font-bold" />
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => onDelete(loan.id)} className="flex-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-3 rounded-2xl text-xs font-bold flex justify-center items-center gap-2 hover:bg-rose-500/20 transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <Trash2 size={16}/> PURGAR
          </button>
          <button onClick={() => { 
              onEdit(loan.id, editPrestamista, editWhatsApp, editYape, editSaldo, editCuota, editExigible, editFechaInicio); 
              setIsEditing(false); 
            }} 
            className="flex-1 bg-cyan-500 text-black py-3 rounded-2xl text-xs font-black flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all">
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
                 title={yaPagadoHoy ? "Enviar Comprobante (Anti-Spam)" : "Enviar Estado de Cuenta"}
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

// ==========================================
// MODAL DE PAGO + PUENTE DE REBOTE DE VOUCHER & TICKET 24 CASILLAS
// ==========================================
function PaymentModal({ loan, initialAmount = null, onClose, onSubmit }) {
  const defaultAmt = initialAmount !== null ? initialAmount : (loan.montoExigible > 0 ? loan.montoExigible : loan.cuotaDiaria);
  const [amount, setAmount] = useState(defaultAmt.toString());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('DIGITAL');
  const [nroOperacion, setNroOperacion] = useState('');
  const [voucherPreview, setVoucherPreview] = useState(null);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paidMethod, setPaidMethod] = useState('');
  const [paidOp, setPaidOp] = useState('');
  const [ticketCopiado, setTicketCopiado] = useState(false);
  const [statusMensaje, setStatusMensaje] = useState('');

  const canvasRef = useRef(null);
  
  const todayStr = getLocalTodayString();
  const requiresPassword = loan.lastManualPaymentDate === todayStr && (loan.manualPaymentsCount || 0) >= 1;

  // Permitir pegar captura de Yape directamente con Ctrl+V
  useEffect(() => {
    const handlePaste = (e) => {
      if (isSuccess) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setVoucherPreview(ev.target.result);
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isSuccess]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setVoucherPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return setError("Monto inválido detectado");
    if (numAmount > loan.saldoPendiente) return setError("Excede deuda máxima");
    if (requiresPassword && password !== 'KGB2026') return setError("ACCESO DENEGADO. Clave incorrecta.");
    
    await onSubmit(loan.id, numAmount, paymentMethod, nroOperacion.trim());
    setPaidAmount(numAmount);
    setPaidMethod(paymentMethod);
    setPaidOp(nroOperacion.trim());
    setIsSuccess(true);
  };

  // Dibujar Ticket con 24 casillas + Voucher cuando entra a la pantalla de éxito
  useEffect(() => {
    if (!isSuccess || !canvasRef.current) return;
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const nuevoSaldo = Math.max(0, loan.saldoPendiente - paidAmount);
    const nuevoPagado = (loan.pagadoAcumulado || 0) + paidAmount;

    renderTicketCanvas(canvasRef.current, {
      prestamista: loan.prestamista,
      fechaStr,
      horaStr,
      montoAbono: paidAmount,
      deudaTotal: loan.deudaTotal || 600,
      totalPagado: nuevoPagado,
      saldoRestante: nuevoSaldo,
      cuotaDiaria: loan.cuotaDiaria || 25,
      metodoPago: paidMethod,
      nroOperacion: paidOp,
      voucherDataUrl: voucherPreview
    });
  }, [isSuccess, paidAmount, paidMethod, paidOp, voucherPreview, loan]);

  const copiarTicketAlPortapapeles = async () => {
    if (!canvasRef.current) return false;
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/png'));
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setTicketCopiado(true);
        setStatusMensaje('¡Imagen copiada! Solo presiona Ctrl+V en el chat de WhatsApp');
        setTimeout(() => setTicketCopiado(false), 3500);
        return true;
      }
    } catch (err) {
      console.error("No se pudo copiar al portapapeles:", err);
    }
    return false;
  };

  const descargarTicketPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Ticket_${loan.prestamista}_${getLocalTodayString()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Rebote Inteligente: Copia o Comparte el Ticket de 24 casillas + Abre WhatsApp con Mensaje Anti-Spam
  const handleRebotarAlPrestamista = async () => {
    const saldoActualizado = Math.max(0, loan.saldoPendiente - paidAmount);
    const pagadoActualizado = (loan.pagadoAcumulado || 0) + paidAmount;
    const cuotaSegura = loan.cuotaDiaria > 0 ? loan.cuotaDiaria : 25;
    const totalCuotas = Math.max(1, Math.round((loan.deudaTotal || 600) / cuotaSegura)) || 24;
    const cuotasCubiertas = Math.floor((pagadoActualizado + 0.001) / cuotaSegura);

    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const mensajePlano = generarMensajeAntiSpam({
      prestamista: loan.prestamista,
      fechaStr,
      horaStr,
      montoAbono: paidAmount,
      saldoRestante: saldoActualizado,
      metodoPago: paidMethod,
      nroOperacion: paidOp,
      cuotasCubiertas,
      totalCuotas
    });

    // 1. Intentar copiar automáticamente la imagen del ticket al portapapeles (Ideal en PC/Laptop)
    await copiarTicketAlPortapapeles();

    // 2. Si está en celular y soporta compartir archivos nativos a WhatsApp, ofrecer envío nativo
    if (canvasRef.current && navigator.canShare) {
      try {
        const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/png'));
        const file = new File([blob], `Ticket_${loan.prestamista}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Comprobante ${loan.prestamista}`,
            text: mensajePlano,
            files: [file]
          });
          return;
        }
      } catch (err) {
        // Si cancela o falla share nativo, continúa al enlace directo de WhatsApp
      }
    }

    // 3. Abrir el chat directo del prestamista con el mensaje Anti-Spam listo
    if (loan.telefono) {
      const urlSegura = `https://api.whatsapp.com/send?phone=51${loan.telefono}&text=${encodeURIComponent(mensajePlano)}`;
      window.open(urlSegura, '_blank');
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 overflow-y-auto animate-in fade-in duration-300">
        <div className="bg-[#0a0a0a] w-full max-w-md rounded-[36px] border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.25)] p-5 sm:p-6 relative overflow-hidden my-auto max-h-[94dvh] flex flex-col">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle size={22} className="text-emerald-400" />
              <h3 className="text-base font-black text-white uppercase tracking-tight">Ticket Oficial + 24 Casillas</h3>
            </div>
            <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Vista previa del Ticket en Imagen generado por el programa */}
          <div className="overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-2 mb-3 flex-1 [&::-webkit-scrollbar]:hidden">
            <canvas ref={canvasRef} className="w-full h-auto rounded-xl shadow-lg" />
          </div>

          {statusMensaje && (
            <p className="text-[11px] text-emerald-400 font-black text-center mb-2 animate-pulse">
              {statusMensaje}
            </p>
          )}

          {/* Botones de Rebote al Prestamista */}
          <div className="space-y-2.5 shrink-0">
            <button 
              onClick={handleRebotarAlPrestamista} 
              className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(37,211,102,0.4)] text-xs uppercase tracking-wider"
            >
              <MessageCircle size={18} />
              <span>Rebotar Ticket + Mensaje a {loan.prestamista}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copiarTicketAlPortapapeles}
                className="bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-black py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 hover:bg-cyan-500/25 transition-all uppercase"
              >
                {ticketCopiado ? <Check size={15} /> : <Copy size={15} />}
                <span>{ticketCopiado ? '¡Imagen Copiada!' : 'Copiar Imagen'}</span>
              </button>
              <button
                onClick={descargarTicketPNG}
                className="bg-white/5 border border-white/10 text-slate-200 font-black py-2.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all uppercase"
              >
                <Download size={15} />
                <span>Descargar PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] border border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] p-6 sm:p-7 pb-10 sm:pb-7 relative overflow-y-auto max-h-[92dvh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-400 [&::-webkit-scrollbar]:hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px]"></div>
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h3 className="text-lg font-black text-white tracking-tighter uppercase">
            Procesar Pago: <span className="text-emerald-400">{loan.prestamista}</span>
          </h3>
          <button onClick={onClose} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
        </div>
        
        <div className="flex gap-2 mb-4 relative z-10">
          <button onClick={() => setPaymentMethod('DIGITAL')} className={`flex-1 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'DIGITAL' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black/50 text-slate-500 border-white/5 hover:bg-black/80'}`}><Smartphone size={15}/> YAPE / DIGITAL</button>
          <button onClick={() => setPaymentMethod('EFECTIVO')} className={`flex-1 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'EFECTIVO' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-black/50 text-slate-500 border-white/5 hover:bg-black/80'}`}><Banknote size={15}/> EFECTIVO</button>
        </div>

        <div className="space-y-4 mb-6 relative z-10">
          <div>
            <label className="block text-[10px] font-bold text-emerald-400/80 mb-1.5 uppercase tracking-widest">Monto a Registrar (S/)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }}
              className="w-full bg-black border-2 border-emerald-500/30 text-white rounded-2xl px-4 py-3.5 text-2xl font-black outline-none focus:border-emerald-400 text-center shadow-inner transition-all" />
          </div>

          {/* Puente de Comprobante: Nº de Operación y Captura de Yape */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={13} /> Puente de Comprobante (Opcional)
              </span>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Nº de Operación Yape / Ref.</label>
              <div className="relative">
                <Hash size={14} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={nroOperacion}
                  onChange={(e) => setNroOperacion(e.target.value)}
                  placeholder="Ej. 1492837"
                  className="w-full bg-black/70 border border-white/10 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                Adjuntar o Pegar (Ctrl+V) Captura del Yape
              </label>
              {!voucherPreview ? (
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/20 text-cyan-300 text-[11px] font-bold cursor-pointer hover:bg-cyan-950/40 transition-colors">
                  <Upload size={14} />
                  <span>Subir captura o presiona Ctrl+V</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black/60 p-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={voucherPreview} alt="Voucher" className="w-10 h-10 object-cover rounded-lg" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase">Captura Lista para Incrustar</span>
                  </div>
                  <button type="button" onClick={() => setVoucherPreview(null)} className="text-rose-400 p-1.5 hover:bg-rose-500/20 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {requiresPassword && (
            <div className="animate-in slide-in-from-top-4">
              <label className="block text-[10px] font-bold text-rose-400 mb-1.5 flex items-center gap-2 uppercase tracking-widest">
                <Lock size={12} /> <span>Protocolo (KGB2026):</span>
              </label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-black border-2 border-rose-500/40 text-white rounded-2xl px-4 py-3 text-lg text-center tracking-[0.5em] outline-none focus:border-rose-400 shadow-inner transition-all" />
            </div>
          )}
          {error && <p className="text-rose-400 text-xs font-bold text-center uppercase tracking-widest animate-pulse">{error}</p>}
        </div>

        <button onClick={handleSubmit} className="relative w-full overflow-hidden bg-emerald-500 text-black font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] text-sm tracking-widest uppercase transition-all">
           <span className="relative z-10 flex justify-center items-center gap-2">
             <span>Procesar y Generar Ticket 24D</span>
             <CheckCircle size={18}/>
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
  
  const [fechaInicioStr, setFechaInicioStr] = useState(getLocalTodayString());
  const [pagadoPrevioStr, setPagadoPrevioStr] = useState('');

  const [loading, setLoading] = useState(false);

  const capital = parseFloat(capitalStr) || 0;
  const porcentaje = parseFloat(porcentajeStr) || 0;
  const interes = capital * (porcentaje / 100);
  const deudaTotal = capital + interes;
  const cuota = parseFloat(cuotaStr) || 0;
  const pagadoPrevio = parseFloat(pagadoPrevioStr) || 0;

  const todayStr = getLocalTodayString();
  let diasTranscurridos = 0;
  
  if (fechaInicioStr && fechaInicioStr < todayStr) {
    let checkDate = addDaysToDateStr(fechaInicioStr, 1);
    while (checkDate <= todayStr) {
      if (getDayOfWeek(checkDate) !== 0) diasTranscurridos++;
      checkDate = addDaysToDateStr(checkDate, 1);
    }
  }
  
  const saldoActual = Math.max(0, deudaTotal - pagadoPrevio);
  const deudaHipotetica = diasTranscurridos * cuota;
  const exigibleReal = Math.max(0, deudaHipotetica - pagadoPrevio);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prestamista || capital <= 0 || cuota <= 0) return;
    setLoading(true);

    const newLoan = {
      prestamista, 
      telefono, 
      yape,
      capital, 
      porcentajeInteres: porcentaje,
      interes, 
      deudaTotal, 
      cuotaDiaria: cuota,
      saldoPendiente: saldoActual, 
      montoExigible: exigibleReal, 
      pagadoAcumulado: pagadoPrevio,
      fechaInicio: new Date(fechaInicioStr + 'T12:00:00').toISOString(),
      lastProcessedDate: todayStr,
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
    setFechaInicioStr(getLocalTodayString());
    setPagadoPrevioStr('');
  };

  return (
    <div className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 tracking-tighter uppercase">Generar Contrato</h2>
      
      <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border border-white/10 space-y-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
        
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
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Cuota Diaria (S/)</label>
            <input type="number" value={cuotaStr} onChange={(e) => setCuotaStr(e.target.value)} required min="1" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-5 py-4 font-bold outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all" placeholder="25" />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
             <Calendar size={14}/> Sincronizar Préstamo Antiguo
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Fecha de Entrega</label>
              <input type="date" value={fechaInicioStr} onChange={(e) => setFechaInicioStr(e.target.value)} required className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 font-bold outline-none focus:border-cyan-500 transition-all text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Ya pagado (S/)</label>
              <input type="number" value={pagadoPrevioStr} onChange={(e) => setPagadoPrevioStr(e.target.value)} min="0" className="w-full bg-black/60 border border-white/10 text-white rounded-2xl px-4 py-3 font-bold outline-none focus:border-cyan-500 transition-all text-xs" placeholder="0" />
            </div>
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
                <span>DEUDA ORIGINAL:</span> 
                <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">S/ {deudaTotal.toFixed(2)}</span>
              </div>
              
              {(diasTranscurridos > 0 || pagadoPrevio > 0) && (
                <div className="mt-4 pt-4 border-t border-dashed border-cyan-500/30 space-y-2">
                   <div className="flex justify-between text-[10px] text-cyan-400 uppercase tracking-widest">
                     <span>Días Transcurridos:</span> <span>{diasTranscurridos} días hábiles</span>
                   </div>
                   <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest">
                     <span>Ya cobrado:</span> <span>- S/ {pagadoPrevio.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-amber-400 font-black mt-2 tracking-tight">
                     <span>EXIGIBLE HOY (MORA):</span> <span>S/ {exigibleReal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-emerald-300 font-black tracking-tight">
                     <span>SALDO RESTANTE:</span> <span>S/ {saldoActual.toFixed(2)}</span>
                   </div>
                </div>
              )}

              {cuota > 0 && (
                 <div className="text-center mt-4 text-[10px] text-emerald-500/80 uppercase tracking-widest">
                   Se terminará de pagar en aprox. {Math.ceil(saldoActual / cuota)} días hábiles
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

// ==========================================
// HISTORIAL POR COBRADOR + TABLERO 24 CUOTAS + EXPORTADOR DE IMAGEN
// ==========================================
function HistoryTab({ logs, loans, onRevert }) {
  const listaCobradores = useMemo(() => {
    const nombresLoans = loans.map(l => l.prestamista).filter(Boolean);
    const nombresLogs = (logs || []).map(l => l.prestamista).filter(Boolean);
    return [...new Set([...nombresLoans, ...nombresLogs])];
  }, [loans, logs]);

  const [selectedCobrador, setSelectedCobrador] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [copiadoImg, setCopiadoImg] = useState(false);
  const historyCanvasRef = useRef(null);

  useEffect(() => {
    if (listaCobradores.length > 0 && (!selectedCobrador || !listaCobradores.includes(selectedCobrador))) {
      setSelectedCobrador(listaCobradores[0]);
    }
  }, [listaCobradores, selectedCobrador]);

  const loanActual = loans.find(l => l.prestamista === selectedCobrador);
  const logsDelCobrador = (logs || []).filter(log => log.prestamista === selectedCobrador);
  const pagosRegistrados = logsDelCobrador.filter(log => log.tipo === 'PAGO');

  const cuotaDiaria = loanActual?.cuotaDiaria || 25;
  const deudaTotal = loanActual?.deudaTotal || 600;
  const totalCuotasContrato = Math.max(1, Math.round(deudaTotal / cuotaDiaria)) || 24;
  
  const sumaLogsPagos = pagosRegistrados.reduce((acc, p) => acc + (p.monto || 0), 0);
  const totalPagadoReal = loanActual ? (loanActual.pagadoAcumulado || 0) : sumaLogsPagos;
  const saldoPendienteReal = loanActual ? (loanActual.saldoPendiente || 0) : Math.max(0, deudaTotal - totalPagadoReal);

  const cuotasCompletas = Math.floor((totalPagadoReal + 0.001) / cuotaDiaria);
  const residuoParcial = Math.max(0, totalPagadoReal - (cuotasCompletas * cuotaDiaria));

  const pagosCronologicos = [...pagosRegistrados].reverse();
  const montoPrevioSincronizado = Math.max(0, totalPagadoReal - sumaLogsPagos);

  // Renderizar el ticket cuando el usuario abre el generador desde el Historial
  useEffect(() => {
    if (!showTicketModal || !historyCanvasRef.current || !selectedCobrador) return;
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const ultimoPago = pagosRegistrados[0];

    renderTicketCanvas(historyCanvasRef.current, {
      prestamista: selectedCobrador,
      fechaStr,
      horaStr,
      montoAbono: ultimoPago ? ultimoPago.monto : 0,
      deudaTotal,
      totalPagado: totalPagadoReal,
      saldoRestante: saldoPendienteReal,
      cuotaDiaria,
      metodoPago: ultimoPago?.metodo || 'DIGITAL',
      nroOperacion: ultimoPago?.nroOperacion || '',
      voucherDataUrl: null
    });
  }, [showTicketModal, selectedCobrador, deudaTotal, totalPagadoReal, saldoPendienteReal, cuotaDiaria, pagosRegistrados]);

  const copiarCartillaPortapapeles = async () => {
    if (!historyCanvasRef.current) return;
    try {
      const blob = await new Promise(res => historyCanvasRef.current.toBlob(res, 'image/png'));
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopiadoImg(true);
        setTimeout(() => setCopiadoImg(false), 3000);
      }
    } catch (e) {
      console.error("Error al copiar imagen:", e);
    }
  };

  const descargarCartillaPNG = () => {
    if (!historyCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Cartilla_24_Cuotas_${selectedCobrador}.png`;
    link.href = historyCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const enviarCartillaWhatsApp = async () => {
    await copiarCartillaPortapapeles();
    const hoy = new Date();
    const fechaStr = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

    const msg = generarEstadoCuentaAntiSpam({
      prestamista: selectedCobrador,
      fechaStr,
      horaStr,
      saldoRestante: saldoPendienteReal,
      exigible: loanActual?.montoExigible || 0
    });

    if (historyCanvasRef.current && navigator.canShare) {
      try {
        const blob = await new Promise(res => historyCanvasRef.current.toBlob(res, 'image/png'));
        const file = new File([blob], `Cartilla_${selectedCobrador}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `Cartilla ${selectedCobrador}`, text: msg, files: [file] });
          return;
        }
      } catch (e) {}
    }

    if (loanActual?.telefono) {
      const url = `https://api.whatsapp.com/send?phone=51${loanActual.telefono}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
  };

  if (listaCobradores.length === 0) {
    return (
      <div className="text-center p-10 mt-10 relative z-10">
        <FileText className="mx-auto text-slate-700 mb-4" size={48} />
        <p className="text-slate-400 font-bold tracking-wide">Sin cobradores registrados</p>
        <p className="text-slate-600 text-xs mt-2">Agrega un préstamo para ver el expediente de sus 24 cuotas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="mb-2 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <User className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" size={24} />
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter uppercase">Expediente por Cobrador</h2>
        </div>
      </div>

      {/* Selector de Cobradores */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {listaCobradores.map(cobrador => {
          const isSelected = selectedCobrador === cobrador;
          return (
            <button
              key={cobrador}
              onClick={() => setSelectedCobrador(cobrador)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.02]'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              <User size={14} />
              <span>{cobrador}</span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta Resumen del Cobrador + Botón Generador de Ticket en Imagen */}
      <div className="bg-slate-900/80 border border-white/10 rounded-[28px] p-5 backdrop-blur-xl shadow-lg">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">Estado del Cobrador</span>
            <h3 className="text-xl font-black text-white tracking-tight">{selectedCobrador}</h3>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Avance de Cuotas</span>
            <span className="text-lg font-black text-cyan-400">{Math.min(totalCuotasContrato, cuotasCompletas)} / {totalCuotasContrato} DÍAS</span>
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
          onClick={() => setShowTicketModal(true)}
          className="w-full bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/40 text-cyan-300 font-black py-3 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
        >
          <ImageIcon size={16} />
          <span>Generar Ticket en Imagen ({totalCuotasContrato} Casillas)</span>
        </button>
      </div>

      {/* Tablero Visual de las 24 Cuotas */}
      <div className="bg-[#0a0a0a]/90 border border-white/10 rounded-[28px] p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-cyan-400" />
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Cartilla de {totalCuotasContrato} Cuotas (S/ {cuotaDiaria} c/u)</h4>
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
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
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

      {/* Lista Detallada de Pagos Hechos a este Cobrador */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Pagos Realizados a {selectedCobrador} ({pagosRegistrados.length})
          </h4>
        </div>

        {montoPrevioSincronizado > 0.01 && (
          <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 flex justify-between items-center">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 block">Sincronización Inicial (Máquina del Tiempo)</span>
              <p className="text-xs font-bold text-slate-300 mt-0.5">Pagos anteriores registrados al crear el contrato</p>
            </div>
            <span className="text-base font-black text-cyan-400">S/ {montoPrevioSincronizado.toFixed(2)}</span>
          </div>
        )}

        {pagosCronologicos.length === 0 && montoPrevioSincronizado <= 0.01 ? (
          <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-slate-500 text-xs font-bold">Aún no hay abonos individuales registrados para {selectedCobrador}.</p>
          </div>
        ) : (
          [...pagosCronologicos].reverse().map((log, revIdx) => {
            const numeroAbono = pagosCronologicos.length - revIdx;
            const esEfectivo = log.metodo === 'EFECTIVO' || (log.descripcion && log.descripcion.toLowerCase().includes('efectivo'));

            return (
              <div key={log.id} className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-md flex justify-between items-center shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                      Abono #{numeroAbono}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase flex items-center gap-1 ${
                      esEfectivo ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    }`}>
                      {esEfectivo ? <Banknote size={10} /> : <Smartphone size={10} />}
                      {esEfectivo ? 'Efectivo' : 'Yape / Digital'}
                    </span>
                    {log.nroOperacion && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                        Op. #{log.nroOperacion}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    {formatDate(log.fecha)} a las {formatTime(log.fecha)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-emerald-400">S/ {(log.monto || 0).toFixed(2)}</span>
                  <button
                    onClick={() => onRevert(log)}
                    className="bg-rose-500/10 text-rose-400 p-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/30 transition-all"
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

      {/* Modal de Imagen de Cartilla 24 Cuotas */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3">
          <div className="bg-[#0a0a0a] w-full max-w-md rounded-[34px] border border-cyan-500/30 p-5 flex flex-col max-h-[92dvh]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Cartilla Digital: {selectedCobrador}</h4>
              <button onClick={() => setShowTicketModal(false)} className="bg-white/5 p-2 rounded-full text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto rounded-2xl border border-white/10 bg-black p-2 mb-3 flex-1 [&::-webkit-scrollbar]:hidden">
              <canvas ref={historyCanvasRef} className="w-full h-auto rounded-xl" />
            </div>

            <div className="space-y-2">
              <button
                onClick={enviarCartillaWhatsApp}
                className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-black font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                <span>Enviar Cartilla a {selectedCobrador} por WhatsApp</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copiarCartillaPortapapeles}
                  className="bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-black py-2.5 rounded-xl text-[11px] uppercase flex items-center justify-center gap-1.5"
                >
                  {copiadoImg ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiadoImg ? '¡Copiada (Ctrl+V)!' : 'Copiar Imagen'}</span>
                </button>
                <button
                  onClick={descargarCartillaPNG}
                  className="bg-white/5 border border-white/10 text-slate-300 font-black py-2.5 rounded-xl text-[11px] uppercase flex items-center justify-center gap-1.5"
                >
                  <Download size={15} />
                  <span>Descargar PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsTab({ stats, loans }) {
  const total = stats.totalDeuda > 0 ? stats.totalDeuda : 1; 
  const porcCapital = (stats.totalCapital / total) * 100;
  const porcInteres = (stats.totalIntereses / total) * 100;

  return (
    <div className="space-y-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
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
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-12 gap-1 transition-all duration-300 relative ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      {isActive && <div className="absolute inset-0 bg-white/10 rounded-2xl animate-in zoom-in duration-300"></div>}
      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]' : ''}`}>{icon}</div>
      <span className={`relative z-10 text-[7px] sm:text-[8px] uppercase tracking-widest ${isActive ? 'font-black text-cyan-100' : 'font-bold'}`}>{label}</span>
    </button>
  );
}