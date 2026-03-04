"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Tab = "cumples" | "prospects" | "carteras" | "crm";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("cumples");
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r p-4 space-y-2 bg-muted/30">
        <h1 className="font-bold mb-4">Dashboard Asesoría</h1>
        {[["cumples", "Cumpleaños"], ["prospects", "Prospects"], ["carteras", "Propuestas de carteras"], ["crm", "CRM – Informes"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as Tab)} className={`w-full text-left rounded px-3 py-2 ${tab === id ? "bg-primary text-white" : "hover:bg-muted"}`}>{label}</button>
        ))}
        <Button className="w-full mt-6" variant="outline" onClick={async ()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/login';}}>Salir</Button>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {tab === "cumples" && <Cumples />}
        {tab === "prospects" && <Prospects />}
        {tab === "carteras" && <Carteras />}
        {tab === "crm" && <CRM />}
      </main>
    </div>
  );
}

function Cumples() {
  const [days, setDays] = useState(6);
  const [asesor, setAsesor] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetch(`/api/birthdays?days=${days}&asesor=${asesor}`).then((r) => r.json()).then(setRows); }, [days, asesor]);
  const asesores = useMemo(() => Array.from(new Set(rows.map((r) => r.asesor).filter(Boolean))), [rows]);
  return <div className="space-y-3"><h2 className="text-xl font-semibold">Próximos cumpleaños</h2>
    <div className="flex gap-3"><Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>{Array.from({ length: 12 }).map((_,i)=><option key={i+3} value={i+3}>{i+3} días</option>)}</Select>
    <Select value={asesor} onChange={(e) => setAsesor(e.target.value)}><option value="">Todos los asesores</option>{asesores.map((a)=><option key={a} value={a}>{a}</option>)}</Select></div>
    <table className="w-full text-sm border"><thead><tr className="bg-muted"><th>Nombre</th><th>Asesor</th><th>Cumple</th><th>Días</th><th>Teléfono</th><th>Patrimonio</th></tr></thead><tbody>{rows.map((r)=><tr key={r.nombre+r.fechaLabel} className="border-t"><td>{r.nombre}</td><td>{r.asesor}</td><td>{r.fechaLabel}</td><td>{r.diasFaltantes}</td><td><button onClick={()=>navigator.clipboard.writeText(r.telefono)}>{r.telefono || '-'}</button></td><td>{r.patrimonioUSD?`USD ${r.patrimonioUSD.toLocaleString()}`:'-'}</td></tr>)}</tbody></table></div>;
}

function Prospects() {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState(""); const [estado, setEstado] = useState(""); const [cargadoPor, setCargadoPor] = useState("");
  const [nombre, setNombre] = useState(""); const [nuevoPor, setNuevoPor] = useState("FRAN");
  const [editing, setEditing] = useState<any | null>(null);
  const load = () => fetch(`/api/prospects?estado=${estado}&cargadoPor=${cargadoPor}&q=${q}`).then((r) => r.json()).then(setRows);
  useEffect(load, [q, estado, cargadoPor]);
  async function create(force = false) {
    const res = await fetch('/api/prospects',{method:'POST',body:JSON.stringify({nombre,cargadoPor:nuevoPor,force})});
    if (res.status === 409 && confirm('Existe mismo nombre. ¿Crear igual?')) return create(true);
    setNombre(''); load();
  }
  return <div className="space-y-4"><h2 className="text-xl font-semibold">Prospects</h2>
  <div className="border rounded p-3 space-y-2"><h3 className="font-medium">Nuevo prospect</h3><div className="grid grid-cols-3 gap-2"><Input placeholder="Nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} /><Select value={nuevoPor} onChange={(e)=>setNuevoPor(e.target.value)}><option>FRAN</option><option>DANI</option><option>AGUSTINA</option></Select><Button onClick={()=>create()}>Agregar</Button></div></div>
  <div className="flex gap-2"><Input placeholder="Buscar" value={q} onChange={(e)=>setQ(e.target.value)} /><Select value={estado} onChange={(e)=>setEstado(e.target.value)}><option value="">Todos estados</option>{["PENDIENTE","CONTACTADO","EN_SEGUIMIENTO","NEGOCIACION","CERRADO","PERDIDO"].map(e=><option key={e}>{e}</option>)}</Select><Select value={cargadoPor} onChange={(e)=>setCargadoPor(e.target.value)}><option value="">Todos</option><option>FRAN</option><option>DANI</option><option>AGUSTINA</option></Select></div>
  <table className="w-full text-sm border"><thead><tr className="bg-muted"><th>Nombre</th><th>Cargado por</th><th>Fecha carga</th><th>Estado</th><th>Última actualización</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t cursor-pointer" onClick={()=>setEditing(r)}><td>{r.nombre}</td><td>{r.cargadoPor}</td><td>{new Date(r.fechaCarga).toLocaleDateString()}</td><td><Select value={r.estado} onClick={(e)=>e.stopPropagation()} onChange={async(e)=>{await fetch('/api/prospects',{method:'PATCH',body:JSON.stringify({id:r.id,estado:e.target.value})});load();}}>{["PENDIENTE","CONTACTADO","EN_SEGUIMIENTO","NEGOCIACION","CERRADO","PERDIDO"].map(e=><option key={e}>{e}</option>)}</Select></td><td>{new Date(r.updatedAt).toLocaleDateString()}</td><td><Button variant="destructive" onClick={async(e)=>{e.stopPropagation(); if(confirm('¿Borrar?')){await fetch(`/api/prospects?id=${r.id}`,{method:'DELETE'});load();}}}>Borrar</Button></td></tr>)}</tbody></table>
  {editing && <div className="fixed inset-0 bg-black/30 grid place-items-center" onClick={()=>setEditing(null)}><div className="bg-white p-4 rounded w-[520px] space-y-2" onClick={(e)=>e.stopPropagation()}><h4 className="font-semibold">Editar prospect</h4><Input value={editing.nombre} onChange={(e)=>setEditing({...editing,nombre:e.target.value})}/><Select value={editing.estado} onChange={(e)=>setEditing({...editing,estado:e.target.value})}>{["PENDIENTE","CONTACTADO","EN_SEGUIMIENTO","NEGOCIACION","CERRADO","PERDIDO"].map(e=><option key={e}>{e}</option>)}</Select><Textarea rows={5} value={editing.comentario||''} onChange={(e)=>setEditing({...editing,comentario:e.target.value})}/><div className="grid grid-cols-2 gap-2"><Input type="date" value={editing.proximaAccionFecha?.slice(0,10)||''} onChange={(e)=>setEditing({...editing,proximaAccionFecha:e.target.value})}/><Input placeholder="Próxima acción" value={editing.proximaAccionNota||''} onChange={(e)=>setEditing({...editing,proximaAccionNota:e.target.value})}/></div><Button onClick={async()=>{await fetch('/api/prospects',{method:'PATCH',body:JSON.stringify(editing)});setEditing(null);load();}}>Guardar</Button></div></div>}
  </div>;
}

function Carteras() {
  const [data, setData] = useState<any[]>([]); const [tipo,setTipo] = useState("CONSERVADORA");
  const [item, setItem] = useState({ activoNombre:'', ticker:'', tipoActivo:'RENTA_FIJA', porcentaje:0});
  const load = () => fetch('/api/portfolios').then(r=>r.json()).then(setData); useEffect(load,[]);
  const current = data.find((d)=>d.tipo===tipo);
  const sum = (current?.items || []).reduce((a:number,b:any)=>a+Number(b.porcentaje),0);
  return <div className="space-y-3"><h2 className="text-xl font-semibold">Propuestas de carteras</h2>
    <div className="flex gap-2">{["CONSERVADORA","MODERADA","AGRESIVA"].map(t=><Button key={t} variant={tipo===t?'default':'outline'} onClick={()=>setTipo(t)}>{t}</Button>)}<Badge className={sum===100?'bg-green-100 text-green-800':'bg-red-100 text-red-700'}>Total: {sum}%</Badge><Button variant="outline" onClick={()=>window.open(`/api/portfolios/pdf?tipo=${tipo}`,'_blank')}>Descargar PDF</Button></div>
    {current && <>
      <Textarea value={current.descripcion||''} onChange={async(e)=>{const descripcion=e.target.value; setData(data.map(d=>d.id===current.id?{...d,descripcion}:d)); await fetch('/api/portfolios',{method:'POST',body:JSON.stringify({action:'updateDescripcion',id:current.id,descripcion})});}} placeholder="Descripción del perfil" />
      <div className="grid grid-cols-5 gap-2"><Input placeholder="Activo" value={item.activoNombre} onChange={e=>setItem({...item,activoNombre:e.target.value})}/><Input placeholder="Ticker" value={item.ticker} onChange={e=>setItem({...item,ticker:e.target.value})}/><Select value={item.tipoActivo} onChange={e=>setItem({...item,tipoActivo:e.target.value})}><option>RENTA_FIJA</option><option>RENTA_VARIABLE</option></Select><Input type="number" value={item.porcentaje} onChange={e=>setItem({...item,porcentaje:Number(e.target.value)})}/><Button onClick={async()=>{await fetch('/api/portfolios',{method:'POST',body:JSON.stringify({action:'addItem',data:{...item,templateId:current.id}})}); setItem({activoNombre:'',ticker:'',tipoActivo:'RENTA_FIJA',porcentaje:0}); load();}}>Agregar</Button></div>
      <table className="w-full text-sm border"><thead><tr className="bg-muted"><th>Activo</th><th>Ticker</th><th>Tipo</th><th>%</th><th></th></tr></thead><tbody>{current.items.map((it:any)=><tr className="border-t" key={it.id}><td>{it.activoNombre}</td><td>{it.ticker||'-'}</td><td>{it.tipoActivo}</td><td>{it.porcentaje}</td><td><Button variant="destructive" onClick={async()=>{await fetch('/api/portfolios',{method:'POST',body:JSON.stringify({action:'deleteItem',id:it.id})});load();}}>Eliminar</Button></td></tr>)}</tbody></table>
    </>}
  </div>;
}

function CRM() {
  const [threshold, setThreshold] = useState(30000); const [asesor,setAsesor] = useState(''); const [onlyV, setOnlyV]=useState(false); const [q,setQ]=useState('');
  const [rows,setRows]=useState<any[]>([]); const [edit, setEdit]=useState<any|null>(null);
  const load = ()=>fetch(`/api/crm-clients?threshold=${threshold}&asesor=${asesor}&onlyVencidos=${onlyV?1:0}&q=${q}`).then(r=>r.json()).then(setRows);
  useEffect(load,[threshold,asesor,onlyV,q]);
  const asesores = useMemo(()=>Array.from(new Set(rows.map(r=>r.asesor).filter(Boolean))),[rows]);
  return <div className="space-y-3"><h2 className="text-xl font-semibold">CRM – Informes a clientes</h2>
  <div className="flex gap-2 items-center"><Input type="number" min={20000} max={100000} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/><Select value={asesor} onChange={e=>setAsesor(e.target.value)}><option value="">Todos asesores</option>{asesores.map((a)=> <option key={a}>{a}</option>)}</Select><label className="flex gap-1 text-sm"><input type="checkbox" checked={onlyV} onChange={e=>setOnlyV(e.target.checked)}/>Solo vencidos</label><Input placeholder="Buscar nombre" value={q} onChange={e=>setQ(e.target.value)}/></div>
  <table className="w-full text-sm border"><thead><tr className="bg-muted"><th>Nombre</th><th>Asesor</th><th>Patrimonio USD</th><th>Último informe</th><th>Días</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(r=><tr key={r.externalId} className={`border-t ${r.estado==='VENCIDO'?'bg-red-50':''}`}><td>{r.nombre}</td><td>{r.asesor||'-'}</td><td>{r.patrimonioUSD.toLocaleString()}</td><td>{r.lastReportSentAt?new Date(r.lastReportSentAt).toLocaleDateString():'-'}</td><td>{r.days}</td><td><Badge className={r.estado==='VENCIDO'?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}>{r.estado}</Badge></td><td className="space-x-1"><Button onClick={async()=>{await fetch('/api/crm-status',{method:'POST',body:JSON.stringify({clientExternalId:r.externalId,clientName:r.nombre,lastReportSentAt:new Date().toISOString(),notes:r.notes})});load();}}>Marcar enviado hoy</Button><Button variant="outline" onClick={()=>setEdit(r)}>Editar</Button></td></tr>)}</tbody></table>
  {edit && <div className="fixed inset-0 bg-black/30 grid place-items-center" onClick={()=>setEdit(null)}><div className="bg-white p-4 rounded w-[520px]" onClick={e=>e.stopPropagation()}><h4 className="font-semibold mb-2">Editar estado</h4><Input type="date" value={edit.lastReportSentAt?new Date(edit.lastReportSentAt).toISOString().slice(0,10):''} onChange={(e)=>setEdit({...edit,lastReportSentAt:e.target.value})}/><Textarea className="mt-2" rows={4} value={edit.notes||''} onChange={(e)=>setEdit({...edit,notes:e.target.value})}/><Button className="mt-2" onClick={async()=>{await fetch('/api/crm-status',{method:'POST',body:JSON.stringify({clientExternalId:edit.externalId,clientName:edit.nombre,lastReportSentAt:edit.lastReportSentAt,notes:edit.notes})});setEdit(null);load();}}>Guardar</Button></div></div>}
  </div>;
}
