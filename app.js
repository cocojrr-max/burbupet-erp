const SB_URL='https://mnfuxuppxtsszxdddioi.supabase.co';
const SB_KEY='sb_publishable_nYBq3cxAWQhC6EJrcqVx3Q_b9BC8ZjP';
let db,state={session:null,profile:null,workers:[],page:'home'};
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>v?new Date(v+'T12:00:00').toLocaleDateString('es-PE'):'—';
const todayLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const statusLabel=value=>({pending:'Pendiente',approved:'Aprobado',partial:'Aprobado parcialmente',justified:'Justificado',rejected:'Rechazado',accepted:'Aceptado',cancelled:'Cancelado',not_applicable:'No aplica',present:'Presente',absent:'Falta',incomplete:'Marcación incompleta',draft:'Borrador',preparing:'En preparación',closed:'Cerrada',paid:'Pagada',quincenal:'Quincenal',mensual:'Mensual',microempresa:'Planilla microempresa',recibo_honorarios:'Recibo por honorarios'}[value]||value||'—');
const overtimeType=(minutes,threshold=45)=>minutes>=threshold?'Posible hora extra':minutes>0?'Permanencia por validar':'Sin permanencia';
function toast(msg,bad=false){const t=$('#toast');t.textContent=msg;t.style.cssText=`position:fixed;right:20px;top:20px;z-index:99;padding:14px 18px;border-radius:12px;color:white;background:${bad?'#c63e4a':'#275b4b'};box-shadow:0 8px 25px #0003`;setTimeout(()=>t.textContent='',4000)}
window.addEventListener('DOMContentLoaded',async()=>{db=supabase.createClient(SB_URL,SB_KEY);$('#login-form').onsubmit=login;$('#signup').onclick=signup;$('#reset').onclick=reset;$('#logout').onclick=()=>db.auth.signOut();$('#refresh').onclick=()=>loadPage();$('#menu').onclick=()=>$('.app aside').classList.toggle('open');db.auth.onAuthStateChange((_e,s)=>setTimeout(()=>boot(s),0));const {data:{session}}=await db.auth.getSession();await boot(session);if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js')});
async function login(e){e.preventDefault();const {error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)toast(error.message,true)}
async function signup(){const email=$('#email').value.trim(),password=$('#password').value;if(!email||password.length<8)return toast('Escribe tu correo y una contraseña de al menos 8 caracteres.',true);const {error}=await db.auth.signUp({email,password});toast(error?error.message:'Revisa tu correo para confirmar el acceso.',!!error)}
async function reset(){const email=$('#email').value.trim();if(!email)return toast('Escribe primero tu correo.',true);const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.href});toast(error?error.message:'Te enviamos el enlace para cambiar tu contraseña.',!!error)}
async function boot(session){state.session=session;if(!session){$('#auth').classList.remove('hidden');$('#app').classList.add('hidden');return}const {data,error}=await db.from('profiles').select('*').eq('id',session.user.id).single();if(error||!data)return toast('Tu correo aún no está habilitado. Solicita al administrador que lo registre.',true);state.profile=data;$('#auth').classList.add('hidden');$('#app').classList.remove('hidden');$('#hello').textContent='';$('#profile-name').textContent=data.display_name||data.email;$('#profile-role').textContent=data.app_role==='admin'?'Administrador':'Trabajador';$('#role-switch').style.display=data.app_role==='admin'?'flex':'none';renderNav();await loadPage()}
function renderNav(){const admin=state.profile.app_role==='admin';const items=admin?[['home','▦','Resumen'],['workers','♙','Trabajadores'],['attendance','◉','Asistencia'],['payroll','▤','Planilla'],['schedules','▣','Horarios'],['requests','◇','Solicitudes']]:[['home','▦','Mi resumen'],['attendance','◉','Mi asistencia'],['payroll','▤','Mis pagos'],['schedules','▣','Mi horario'],['requests','◇','Justificaciones']];$('#nav').innerHTML=items.map(([id,icon,n])=>`<button data-page="${id}" class="${state.page===id?'active':''}"><i>${icon}</i>${n}</button>`).join('');$('#nav').onclick=e=>{const b=e.target.closest('button');if(b){state.page=b.dataset.page;renderNav();loadPage();$('.app aside').classList.remove('open')}}}
async function loadPage(){const titles={home:state.profile?.app_role==='admin'?'Panel de gestión':'Mi portal',workers:'Trabajadores',attendance:'Asistencia',schedules:'Horarios',payroll:'Planilla',requests:'Solicitudes y permisos'};$('#title').textContent=titles[state.page];$('#view').innerHTML='<div class="card empty">Cargando información…</div>';try{if(state.page==='home')await home();if(state.page==='workers')await workers();if(state.page==='attendance')await attendance();if(state.page==='schedules')await schedules();if(state.page==='payroll')await payroll();if(state.page==='requests')await requests()}catch(e){$('#view').innerHTML=`<div class="card empty">No se pudo cargar: ${esc(e.message)}</div>`}}
async function getWorkers(){const {data,error}=await db.from('workers').select('*').order('full_name');if(error)throw error;state.workers=data||[];return state.workers}
async function home(){const admin=state.profile.app_role==='admin';if(admin)await getWorkers();const wid=state.profile.worker_id;let aq=db.from('attendance').select('*');if(!admin)aq=aq.eq('worker_id',wid);const [{data:a},{data:r},{data:p}]=await Promise.all([aq,admin?db.from('requests').select('*').eq('status','pending'):db.from('requests').select('*').eq('worker_id',wid),admin?db.from('payroll_items').select('*'):db.from('payroll_items').select('*').eq('worker_id',wid)]);const at=a||[],pending=(r||[]).filter(x=>x.status==='pending').length,ot=at.reduce((s,x)=>s+x.overtime_minutes,0),inc=at.filter(x=>x.review_status==='pending'&&(x.status!=='present'||x.late_minutes||x.early_leave_minutes)).length,present=at.filter(x=>x.status==='present').length;if(!admin){$('#view').innerHTML=`<div class="management-hero"><div><em>MI PLANILLA EN CURSO</em><h2>Información laboral en tiempo real</h2><p>Consulta tus horarios, asistencias e incidencias.</p></div></div><div class="grid"><div class="card stat accent-blue"><span>Días trabajados</span><strong>${present}</strong><small>Días registrados</small></div><div class="card stat accent-yellow"><span>Incidencias</span><strong>${inc}</strong><small>Pendientes</small></div><div class="card stat accent-mint"><span>Horas extras</span><strong>${(ot/60).toFixed(1)} h</strong><small>Pendientes de aprobación</small></div></div>`;return}const active=state.workers.filter(w=>w.active),salary=active.reduce((s,w)=>s+Number(w.base_salary),0),w=active[0];$('#view').innerHTML=`<div class="incident-banner"><div><b>◷ &nbsp; Tienes incidencias por revisar</b><span>${inc} incidencias · ${pending} solicitudes</span></div><button onclick="state.page='attendance';renderNav();loadPage()">Revisar ahora</button></div><div class="management-hero"><div><em>PLANILLA EN PREPARACIÓN</em><h2>Primera quincena de septiembre</h2><p>Periodo del 1 al 15 de septiembre de 2026 · ${active.length} trabajadores activos</p></div><button onclick="state.page='payroll';renderNav();loadPage()">▤ &nbsp; Exportar reporte</button></div><div class="grid dashboard-stats"><div class="card stat accent-blue"><span>Planilla base mensual</span><strong>${money(salary)}</strong><small>Trabajadores activos</small></div><div class="card stat accent-mint"><span>Asistencias</span><strong>${present}</strong><small>Días registrados</small></div><div class="card stat accent-green"><span>Horas extras</span><strong>${(ot/60).toFixed(1)} h</strong><small>Pendientes de aprobación</small></div><div class="card stat accent-yellow"><span>Incidencias</span><strong>${inc}</strong><small>Pendientes de resolver</small></div></div><section class="team-panel"><div class="panel-title"><div><em>GESTIÓN DEL EQUIPO</em><h2>Trabajadores</h2><p>Registra datos personales, laborales y el sueldo mensual que usará la planilla.</p></div><button onclick="state.page='workers';renderNav();loadPage();setTimeout(()=>workerForm(),100)">＋ &nbsp; Nuevo trabajador</button></div>${w?`<div class="employee-preview"><div class="employee-head"><span>${esc(w.full_name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><div><b>${esc(w.full_name)}</b><small>${esc(w.job_title)}</small></div><mark>Activo</mark></div><div class="employee-data"><div><small>DNI</small><b>${esc(w.dni)}</b></div><div><small>Área</small><b>${esc(w.area)}</b></div></div></div>`:''}</section>`}
async function workers(){if(state.profile.app_role!=='admin')return home();await getWorkers();$('#view').innerHTML=`<div class="section-head"><h2>Personal registrado</h2><button onclick="workerForm()">+ Nuevo trabajador</button></div><div class="table-wrap"><table><thead><tr><th>Colaborador</th><th>Cargo</th><th>Sueldo</th><th>Pago</th><th>Régimen</th><th>Estado</th><th></th></tr></thead><tbody>${state.workers.map(w=>`<tr><td><b>${esc(w.full_name)}</b><br><small>${esc(w.email||'Sin correo')}</small></td><td>${esc(w.job_title)}<br><small>${esc(w.area)}</small></td><td>${money(w.base_salary)}</td><td>${esc(statusLabel(w.payment_frequency))}</td><td>${esc(statusLabel(w.payment_type))}</td><td><span class="badge ${w.active?'ok':'danger'}">${w.active?'Activo':'Retirado'}</span></td><td class="actions"><button onclick="workerForm(${w.id})">Editar</button><button class="danger-btn" onclick="retire(${w.id},${w.active})">${w.active?'Retirar':'Reactivar'}</button></td></tr>`).join('')}</tbody></table></div>`}
function modal(html){document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="modal"><div>${html}<button class="secondary" onclick="$('#modal').remove()">Cerrar</button></div></div>`)}
function workerForm(id){
  const w=state.workers.find(x=>x.id===id)||{};
  modal(`<h2>${id?'Editar':'Nuevo'} trabajador</h2>
    <form id="worker-form" class="forms">
      <label>Nombre completo<input name="full_name" required value="${esc(w.full_name)}"></label>
      <label>DNI<input name="dni" required value="${esc(w.dni)}"></label>
      <label>Código del huellero<input name="code" required value="${esc(w.code)}"></label>
      <label>Correo electrónico<input name="email" type="email" required value="${esc(w.email)}"></label>
      <label>Dirección<input name="address" value="${esc(w.address)}"></label>
      <label>Teléfono<input name="phone" value="${esc(w.phone)}"></label>
      <label>Fecha de nacimiento<input name="birth_date" type="date" value="${esc(w.birth_date)}"></label>
      <label>Fecha de ingreso<input name="hire_date" type="date" value="${esc(w.hire_date)}"></label>
      <label>Cargo
        <input name="job_title" list="job-title-options" required value="${esc(w.job_title)}" placeholder="Selecciona o escribe un cargo">
        <datalist id="job-title-options"><option value="Administrador"><option value="Médico veterinario"><option value="Asistente veterinario"><option value="Groomer"><option value="Recepcionista"><option value="Conductor"><option value="Asesor de Pet Shop"><option value="Personal de limpieza"></datalist>
      </label>
      <label>Área
        <input name="area" list="area-options" required value="${esc(w.area)}" placeholder="Selecciona o escribe un área">
        <datalist id="area-options"><option value="Administración"><option value="Área médica"><option value="Grooming"><option value="Recepción"><option value="Pet Shop"><option value="Transporte"><option value="Limpieza"></datalist>
      </label>
      <label>Sueldo mensual<input name="base_salary" type="number" min="0" step=".01" required value="${esc(w.base_salary)}"></label>
      <label>Frecuencia de pago<select name="payment_frequency"><option value="quincenal" ${w.payment_frequency==='quincenal'?'selected':''}>Quincenal</option><option value="mensual" ${w.payment_frequency==='mensual'?'selected':''}>Mensual</option></select></label>
      <label>Modalidad<select name="payment_type"><option value="microempresa">Planilla microempresa</option><option value="recibo_honorarios" ${w.payment_type==='recibo_honorarios'?'selected':''}>Recibo por honorarios</option></select></label>
      <label>Vacaciones anuales<input name="annual_vacation_days" type="number" value="15" readonly><small>Régimen de microempresa: 15 días calendario.</small></label>
      <label>Sistema pensionario
        <select name="pension_system" id="pension-system" onchange="togglePensionFields()"><option value="afp" ${!w.pension_system||w.pension_system==='afp'?'selected':''}>AFP</option><option value="onp" ${w.pension_system==='onp'?'selected':''}>ONP</option><option value="ninguno" ${w.pension_system==='ninguno'?'selected':''}>Ninguno</option></select>
      </label>
      <label id="afp-field">Nombre de AFP<input name="afp_name" value="${esc(w.afp_name)}" placeholder="Integra, Prima, Profuturo o Hábitat"></label>
      <label>Descuento pensionario (%)<input name="pension_rate" id="pension-rate" type="number" min="0" max="100" step=".01" value="${esc(w.pension_rate??13)}"></label>
      <div class="notice full"><b>Beneficios de microempresa</b><br>15 días de vacaciones. No se calculan CTS, gratificaciones legales ni asignación familiar. La empresa podrá agregar una bonificación extraordinaria voluntaria al preparar la planilla.</div>
      <button class="full">Guardar trabajador</button>
    </form>`);
  togglePensionFields();
  $('#worker-form').onsubmit=async e=>{
    e.preventDefault();
    const o=Object.fromEntries(new FormData(e.target));
    o.base_salary=+o.base_salary;
    o.pension_rate=o.pension_system==='ninguno'?0:+o.pension_rate;
    o.afp_name=o.pension_system==='afp'?(o.afp_name||null):null;
    o.annual_vacation_days=15;
    o.has_family_allowance=false;
    o.family_allowance_amount=0;
    if(!id)o.active=true;
    const q=id?db.from('workers').update(o).eq('id',id):db.from('workers').insert(o);
    const {error}=await q;
    if(error)return toast(error.message,true);
    $('#modal').remove();toast('Trabajador guardado');workers();
  };
}

function togglePensionFields(){
  const system=$('#pension-system'),afp=$('#afp-field'),rate=$('#pension-rate');
  if(!system)return;
  afp.classList.toggle('hidden',system.value!=='afp');
  if(system.value==='afp'&&Number(rate.value)===0)rate.value=13;
  if(system.value==='onp')rate.value=13;
  if(system.value==='ninguno')rate.value=0;
}

function toggleFamilyFields(){
  const select=$('#family-allowance'),fields=$('#family-fields');
  if(!select||!fields)return;
  const enabled=select.value==='si';
  fields.classList.toggle('hidden',!enabled);
  if(enabled&&!$('#dependents').children.length)addDependent();
  fields.querySelectorAll('input,button').forEach(control=>control.disabled=!enabled);
}

function addDependent(data={}){
  const list=$('#dependents');if(!list)return;
  const row=document.createElement('div');row.className='dependent-row';
  row.innerHTML=`<label>Nombre completo<input data-field="full_name" required value="${esc(data.full_name)}"></label><label>DNI o documento<input data-field="dni" value="${esc(data.dni)}"></label><label>Fecha de nacimiento<input data-field="birth_date" type="date" required value="${esc(data.birth_date)}"></label><button type="button" class="danger-btn" onclick="this.parentElement.remove()">Eliminar</button>`;
  list.appendChild(row);
}
async function retire(id,active){const {error}=await db.from('workers').update({active:!active,termination_date:active?new Date().toISOString().slice(0,10):null}).eq('id',id);toast(error?error.message:active?'Trabajador marcado como retirado.':'Trabajador reactivado.',!!error);workers()}
async function attendance(){const admin=state.profile.app_role==='admin';if(admin)await getWorkers();let q=db.from('attendance').select('*,workers(full_name,base_salary)').order('work_date',{ascending:false});if(!admin)q=q.eq('worker_id',state.profile.worker_id);const [{data,error},{data:settings}]=await Promise.all([q,db.from('company_settings').select('overtime_tolerance').eq('id',1).single()]);if(error)throw error;const rows=data||[],threshold=Number(settings?.overtime_tolerance||45);$('#view').innerHTML=`${admin?`<div class="upload"><h2>Procesar reporte del huellero</h2><p>Carga el archivo .xls original. Los días ya revisados conservarán su decisión.</p><input id="xls" type="file" accept=".xls,.xlsx"><button onclick="importExcel()">Cargar y calcular</button></div>`:''}<div class="notice">Las permanencias de 1 a ${threshold-1} minutos se validan. Desde ${threshold} minutos se marcan como posible hora extra. Solo los minutos aprobados pasan a la planilla.</div><div class="section-head"><h2>Incidencias y marcaciones</h2></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Ingreso / salida</th><th>Tardanza</th><th>Permanencia</th><th>Extra aprobada</th><th>Estado</th><th>Revisión</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${date(x.work_date)}</td><td>${esc(x.workers?.full_name||'')}</td><td>${esc(x.clock_in||'—')} / ${esc(x.clock_out||'—')}</td><td>${x.late_minutes} min</td><td><b>${x.overtime_minutes} min</b><br><small>${esc(overtimeType(x.overtime_minutes,threshold))}</small></td><td>${x.approved_overtime_minutes||0} min<br><small>${esc(statusLabel(x.overtime_review_status))}</small></td><td><span class="badge ${x.status==='present'?'ok':'danger'}">${esc(statusLabel(x.status))}</span></td><td>${admin?`<div class="review-actions">${x.overtime_minutes>0?`<button onclick="reviewOvertime(${x.id},${x.overtime_minutes},${x.approved_overtime_minutes||0})">Revisar tiempo</button>`:''}<select onchange="reviewAttendance(${x.id},this.value)"><option value="">${esc(statusLabel(x.review_status))}</option><option value="approved">Aprobar incidencia</option><option value="justified">Justificar</option><option value="rejected">Rechazar</option></select></div>`:`<button onclick="justify(${x.id})">${x.review_status==='pending'?'Justificar':'Ver: '+esc(statusLabel(x.review_status))}</button>`}</td></tr>`).join('')}</tbody></table></div>`}
const attendanceUnfiltered=attendance;
attendance=async function(){
  await attendanceUnfiltered();
  const selected=state.attendanceMonth||todayLocal().slice(0,7),head=$('#view .section-head');
  if(!head)return;
  head.insertAdjacentHTML('beforeend',`<label class="month-filter">Mes visible <input type="month" value="${selected}" onchange="applyAttendanceMonthFilter(this.value)"></label>`);
  $('#view .table-wrap').insertAdjacentHTML('afterend','<p id="attendance-empty" class="empty hidden">No hay registros de asistencia en este mes.</p>');
  applyAttendanceMonthFilter(selected);
  if(state.profile.app_role==='admin')await addIncompleteActions();
};
function applyAttendanceMonthFilter(value){
  state.attendanceMonth=value;
  let visible=0;
  document.querySelectorAll('#view .table-wrap tbody tr').forEach(row=>{
    const parts=(row.cells[0]?.textContent||'').trim().split('/'),rowMonth=parts.length===3?`${parts[2]}-${String(parts[1]).padStart(2,'0')}`:'';
    const show=rowMonth===value;row.classList.toggle('hidden',!show);if(show)visible++;
  });
  $('#attendance-empty')?.classList.toggle('hidden',visible>0);
}
async function addIncompleteActions(){
  const {data}=await db.from('attendance').select('id,worker_id,work_date,status,overtime_minutes,worker_response,admin_note,workers(full_name)');
  const records=new Map((data||[]).map(x=>[`${date(x.work_date)}|${x.workers?.full_name}`,x]));
  document.querySelectorAll('#view .table-wrap tbody tr').forEach(row=>{
    const key=`${row.cells[0].textContent.trim()}|${row.cells[1].textContent.trim().replace(/\s+/g,' ')}`,item=records.get(key);if(!item)return;
    const buttons=[];
    if(item.status==='incomplete')buttons.push(`<button type="button" onclick="completeAttendance(${item.id})">Completar hora</button>`,`<button type="button" class="secondary" onclick="requestAttendanceExplanation(${item.id},'marcación')">Solicitar explicación</button>`);
    if(Number(item.overtime_minutes)>0)buttons.push(`<button type="button" class="secondary" onclick="requestAttendanceExplanation(${item.id},'permanencia')">Solicitar sustento</button>`);
    if(item.worker_response)buttons.push(`<button type="button" class="response-btn" onclick="viewAttendanceResponse(${item.id})">Ver respuesta</button>`);
    if(buttons.length){const box=document.createElement('div');box.className='actions incomplete-actions';box.innerHTML=buttons.join('');row.cells[7].appendChild(box)}
  });
}
async function completeAttendance(id){
  const {data:x,error}=await db.from('attendance').select('*').eq('id',id).single();if(error)return toast(error.message,true);
  const {data:rules}=await db.from('company_settings').select('late_tolerance').eq('id',1).single(),lateTolerance=Number(rules?.late_tolerance??5);
  const mins=t=>{const [h,m]=String(t).slice(0,5).split(':').map(Number);return h*60+m};let knownIn=x.clock_in,knownOut=x.clock_out;
  if(knownIn&&!knownOut&&x.scheduled_start&&x.scheduled_end&&mins(knownIn)>(mins(x.scheduled_start)+mins(x.scheduled_end))/2){knownOut=knownIn;knownIn=null}
  const missing=knownIn?'salida':'entrada';modal(`<h2>Completar marcación</h2><p>La marca existente corresponde a la ${knownIn?'entrada':'salida'}. Registra manualmente la hora de ${missing}.</p><form id="complete-mark"><label>Hora de ${missing}<input type="time" name="time" required></label><label>Motivo de la corrección<textarea name="note" required placeholder="Ej.: olvidó marcar la ${missing}"></textarea></label><button>Guardar corrección</button></form>`);
  $('#complete-mark').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),value=f.get('time'),clock_in=knownIn||value,clock_out=knownOut||value;let late=0,early=0,overtime=0;if(x.scheduled_start&&x.scheduled_end){const delay=Math.max(0,mins(clock_in)-mins(x.scheduled_start));late=delay>lateTolerance?delay:0;early=Math.max(0,mins(x.scheduled_end)-mins(clock_out));overtime=Math.max(0,mins(clock_out)-mins(x.scheduled_end))}const clean=late===0&&early===0&&overtime===0,update={clock_in,clock_out,status:'present',late_minutes:late,early_leave_minutes:early,overtime_minutes:overtime,overtime_review_status:overtime>0?'pending':'not_applicable',approved_overtime_minutes:0,review_status:clean?'approved':'pending',admin_note:`Marcación completada por administración: ${f.get('note')}`};const {error:ue}=await db.from('attendance').update(update).eq('id',id);if(ue)return toast(ue.message,true);$('#modal').remove();toast('Marcación completada y cálculos actualizados.');attendance()};
}
async function requestAttendanceExplanation(id,type='marcación'){const suggested=type==='permanencia'?'Por favor, sustenta el motivo por el que permaneciste después de tu hora de salida.':'Por favor, explica por qué falta una marcación en esta fecha.',message=prompt('Mensaje para el trabajador:',suggested);if(!message)return;const {error}=await db.from('attendance').update({review_status:'pending',admin_note:`Solicitud de ${type} del administrador: ${message}`}).eq('id',id);toast(error?error.message:'Solicitud enviada al portal del trabajador.',!!error);attendance()}
async function viewAttendanceResponse(id){const {data:x,error}=await db.from('attendance').select('*,workers(full_name)').eq('id',id).single();if(error)return toast(error.message,true);modal(`<h2>Respuesta del trabajador</h2><p><b>${esc(x.workers?.full_name||'')}</b> · ${date(x.work_date)}</p>${x.admin_note?`<div class="notice"><b>Solicitud enviada</b><br>${esc(x.admin_note)}</div>`:''}<div class="worker-response"><b>Respuesta o sustento</b><p>${esc(x.worker_response||'Sin respuesta todavía.')}</p></div><div class="actions decision-actions"><button onclick="decideAttendance(${id},'approved')">Aprobar</button><button class="secondary" onclick="decideAttendance(${id},'justified')">Justificar</button><button class="danger-btn" onclick="decideAttendance(${id},'rejected')">Rechazar</button></div><small>La aprobación de esta incidencia no aprueba automáticamente horas extras; el tiempo adicional se revisa por separado.</small>`)}
async function decideAttendance(id,status){const note=prompt('Comentario final del administrador:')||'';const {error}=await db.from('attendance').update({review_status:status,admin_note:note||undefined}).eq('id',id);if(error)return toast(error.message,true);$('#modal')?.remove();toast('Incidencia resuelta correctamente.');attendance()}
async function reviewAttendance(id,status){if(!status)return;const note=prompt('Nota del administrador (opcional):')||'';const {error}=await db.from('attendance').update({review_status:status,admin_note:note}).eq('id',id);toast(error?error.message:'Incidencia actualizada.',!!error);attendance()}
function reviewOvertime(id,detected,current=0){modal(`<h2>Revisar permanencia posterior</h2><p>El huellero detectó <b>${detected} minutos</b> después del horario de salida.</p><form id="overtime-review" class="form-card"><label>Decisión<select name="decision"><option value="approved">Aprobar todo el tiempo</option><option value="partial" ${current>0&&current<detected?'selected':''}>Aprobar parcialmente</option><option value="rejected">Rechazar</option></select></label><label>Minutos reconocidos<input name="minutes" type="number" min="0" max="${detected}" value="${current||detected}" required></label><label>Motivo o sustento<textarea name="note" required placeholder="Ej.: cierre de caja autorizado, atención de emergencia o permanencia no laborada"></textarea></label><button>Guardar decisión</button></form>`);$('#overtime-review').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),decision=f.get('decision');let minutes=Number(f.get('minutes'));if(decision==='approved')minutes=detected;if(decision==='rejected')minutes=0;if(minutes<0||minutes>detected)return toast('Los minutos aprobados deben estar entre 0 y '+detected+'.',true);const {error}=await db.from('attendance').update({approved_overtime_minutes:minutes,overtime_review_status:decision,overtime_review_note:f.get('note'),overtime_reviewed_at:new Date().toISOString(),overtime_reviewed_by:state.session.user.id}).eq('id',id);if(error)return toast(error.message,true);$('#modal').remove();toast('Tiempo posterior revisado correctamente.');attendance()}}
async function justify(id){const {data:x}=await db.from('attendance').select('admin_note,worker_response').eq('id',id).single();modal(`<h2>Responder incidencia</h2>${x?.admin_note?`<div class="notice"><b>Mensaje del administrador</b><br>${esc(x.admin_note)}</div>`:''}<form id="just"><label>Explica lo ocurrido<textarea name="worker_response" required>${esc(x?.worker_response||'')}</textarea></label><button>Enviar respuesta</button></form>`);$('#just').onsubmit=async e=>{e.preventDefault();const response=new FormData(e.target).get('worker_response');const {error}=await db.from('attendance').update({review_status:'pending',worker_response:response}).eq('id',id);if(error)return toast(error.message,true);$('#modal').remove();toast('Respuesta enviada al administrador para su revisión.');attendance()}}
async function importExcel(){
  const file=$('#xls').files[0];
  if(!file)return toast('Selecciona el archivo del huellero.',true);
  toast('Procesando el reporte…');
  try{
    await getWorkers();
    const book=XLSX.read(await file.arrayBuffer(),{type:'array'}),sheet=book.Sheets['Reporte de Asistencia'];
    if(!sheet)throw Error('No se encontró la pestaña Reporte de Asistencia.');
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''});
    const period=rows.flat().map(String).find(v=>/\d{4}-\d{2}-\d{2}\s*~/.test(v))||'',m=period.match(/(\d{4})-(\d{2})-/);
    if(!m)throw Error('No se reconoció el periodo.');
    const year=+m[1],month=+m[2],dates=period.match(/\d{4}-\d{2}-\d{2}/g)||[];
    const reportDates=rows.flat().flatMap(v=>String(v).match(/\d{4}-\d{2}-\d{2}/g)||[]);
    const generatedDate=reportDates.find(d=>d!==dates[0]&&d!==dates[1]);
    const cutoff=[dates[1],generatedDate,todayLocal()].filter(Boolean).sort()[0];
    const isDayCell=v=>{const n=Number(String(v).trim().replace(',','.'));return Number.isInteger(n)&&n>=1&&n<=31};
    const detectedDayRow=rows.findIndex(r=>r.filter(isDayCell).length>=20);
    const firstWorkerRow=rows.findIndex(r=>r.some(v=>String(v).trim()==='ID:'));
    const dayRow=detectedDayRow>=0?detectedDayRow:firstWorkerRow-1;
    if(dayRow<0)throw Error('No se reconoció la estructura del reporte de asistencia.');
    const detectedDays=(rows[dayRow]||[]).map((cell,c)=>({day:Number(String(cell).trim().replace(',','.')),c})).filter(x=>isDayCell(x.day));
    const daysInMonth=new Date(year,month,0).getDate();
    const dayColumns=detectedDays.length>=20?detectedDays:Array.from({length:daysInMonth},(_,c)=>({day:c+1,c}));
    const [{data:sched},{data:rules}]=await Promise.all([db.from('schedules').select('*'),db.from('company_settings').select('late_tolerance').eq('id',1).single()]),daily=[],lateTolerance=Number(rules?.late_tolerance??5);
    for(let r=dayRow+1;r<rows.length-1;r++){
      const row=rows[r].map(String),idx=row.findIndex(v=>v.trim()==='ID:');
      if(idx<0)continue;
      const code=String(row.slice(idx+1).find(v=>v.trim()&&/^\d+$/.test(v.trim()))||''),worker=state.workers.find(w=>String(w.code)===code);
      if(!worker)continue;
      const events=(rows[r+1]||[]).map(String);
      dayColumns.forEach(({day,c})=>{
        const js=new Date(year,month-1,day),dow=js.getDay()||7,shift=(sched||[]).filter(s=>s.worker_id===worker.id&&s.day_of_week===dow).sort((a,b)=>b.week_start.localeCompare(a.week_start))[0];
        const marks=(events[c]||'').match(/\d{2}:\d{2}/g)||[],work_date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
        if(work_date>cutoff)return;
        if(!shift?.is_workday){
          if(!marks.length)return;
          const unscheduled={worker_id:worker.id,work_date,scheduled_start:null,scheduled_end:null,raw_marks:marks,source:'excel',late_minutes:0,early_leave_minutes:0,overtime_minutes:0,approved_overtime_minutes:0,overtime_review_status:'not_applicable',review_status:'pending',admin_note:'Horario no configurado para esta fecha',status:marks.length>1?'present':'incomplete'};
          unscheduled.clock_in=marks[0];if(marks.length>1)unscheduled.clock_out=marks.at(-1);daily.push(unscheduled);return;
        }
        let o={worker_id:worker.id,work_date,scheduled_start:shift.start_time,scheduled_end:shift.end_time,raw_marks:marks,source:'excel',late_minutes:0,early_leave_minutes:0,overtime_minutes:0,approved_overtime_minutes:0,overtime_review_status:'not_applicable',review_status:'pending',status:'absent'};
        if(marks.length===1){const mark=marks[0],markMinute=mins(mark),middle=(mins(shift.start_time)+mins(shift.end_time))/2;o.status='incomplete';if(markMinute<=middle){o.clock_in=mark;const delay=Math.max(0,markMinute-mins(shift.start_time));o.late_minutes=delay>lateTolerance?delay:0}else{o.clock_out=mark;o.early_leave_minutes=Math.max(0,mins(shift.end_time)-markMinute)}}
        if(marks.length>1){
          o.clock_in=marks[0];o.clock_out=marks.at(-1);o.status='present';
          {const delay=Math.max(0,mins(o.clock_in)-mins(shift.start_time));o.late_minutes=delay>lateTolerance?delay:0}
          o.early_leave_minutes=Math.max(0,mins(shift.end_time)-mins(o.clock_out));
          o.overtime_minutes=Math.max(0,mins(o.clock_out)-mins(shift.end_time));
          o.overtime_review_status=o.overtime_minutes>0?'pending':'not_applicable';
          if(o.late_minutes===0&&o.early_leave_minutes===0&&o.overtime_minutes===0)o.review_status='approved';
        }
        daily.push(o);
      });
    }
    if(!daily.length)throw Error('No se encontraron días programados.');
    const importedWorkerIds=[...new Set(daily.map(x=>x.worker_id))];
    if(importedWorkerIds.length&&cutoff<dates[1]){
      const {error:cleanupError}=await db.from('attendance').delete().in('worker_id',importedWorkerIds).eq('source','excel').gt('work_date',cutoff).lte('work_date',dates[1]);
      if(cleanupError)throw cleanupError;
    }
    const {data:existing}=await db.from('attendance').select('*').gte('work_date',dates[0]).lte('work_date',dates[1]);
    const previous=new Map((existing||[]).map(x=>[`${x.worker_id}:${x.work_date}`,x]));
    daily.forEach(x=>{
      const old=previous.get(`${x.worker_id}:${x.work_date}`);
      if(!old)return;
      if(x.review_status!=='approved')x.review_status=old.review_status;
      x.worker_response=old.worker_response;x.admin_note=old.admin_note;
      if(['approved','partial','rejected'].includes(old.overtime_review_status)){
        x.overtime_review_status=old.overtime_review_status;
        x.approved_overtime_minutes=Math.min(old.approved_overtime_minutes||0,x.overtime_minutes);
        x.overtime_review_note=old.overtime_review_note;
        x.overtime_reviewed_at=old.overtime_reviewed_at;
        x.overtime_reviewed_by=old.overtime_reviewed_by;
      }
    });
    const {data:imp,error:ie}=await db.from('attendance_imports').insert({file_name:file.name,period_start:dates[0],period_end:dates[1],uploaded_by:state.session.user.id}).select('id').single();
    if(ie)throw ie;
    daily.forEach(x=>x.import_id=imp.id);
    const {error}=await db.from('attendance').upsert(daily,{onConflict:'worker_id,work_date',ignoreDuplicates:false});
    if(error)throw error;
    toast(`${daily.length} días procesados. Las decisiones anteriores fueron conservadas.`);attendance();
  }catch(e){toast(e.message,true)}
}
async function schedules(){if(state.profile.app_role==='admin')await getWorkers();const admin=state.profile.app_role==='admin',wid=admin?(state.workers[0]?.id):state.profile.worker_id;let q=db.from('schedules').select('*,workers(full_name)').order('day_of_week');if(!admin)q=q.eq('worker_id',wid);const {data,error}=await q;if(error)throw error;const names=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];$('#view').innerHTML=`${admin?`<div class="section-head"><h2>Horario semanal</h2><select id="schedule-worker" onchange="scheduleFor(this.value)">${state.workers.filter(w=>w.active).map(w=>`<option value="${w.id}">${esc(w.full_name)}</option>`).join('')}</select></div>`:''}<div id="schedule-table"><div class="table-wrap"><table><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th>Descanso</th><th>Estado</th></tr></thead><tbody>${(data||[]).map(s=>`<tr><td><b>${names[s.day_of_week-1]}</b></td><td>${esc(s.start_time||'—')}</td><td>${esc(s.end_time||'—')}</td><td>${s.break_minutes} min</td><td><span class="badge ${s.is_workday?'ok':''}">${s.is_workday?'Programado':'Día libre'}</span></td></tr>`).join('')}</tbody></table></div>${admin?'<button style="margin-top:16px" onclick="editSchedule()">Editar horario</button>':''}</div>`}
async function scheduleFor(id){const {data}=await db.from('schedules').select('*').eq('worker_id',id).order('day_of_week');const names=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];$('#schedule-table').innerHTML=`<div class="table-wrap"><table><tbody>${(data||[]).map(s=>`<tr><td>${names[s.day_of_week-1]}</td><td>${s.start_time||'—'} a ${s.end_time||'—'}</td><td>${s.is_workday?'Programado':'Libre'}</td></tr>`).join('')}</tbody></table></div><button style="margin-top:16px" onclick="editSchedule(${id})">Editar horario</button>`}
function editSchedule(id){id=id||+$('#schedule-worker')?.value||state.workers[0].id;const names=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];modal(`<h2>Programar horario</h2><form id="sched-form">${names.map((n,i)=>`<div class="card" style="margin:8px 0"><label><input style="width:auto" type="checkbox" name="d${i+1}" ${i<6?'checked':''}> ${n}</label><div class="forms"><input type="time" name="s${i+1}" value="09:00"><input type="time" name="e${i+1}" value="18:00"></div></div>`).join('')}<button>Guardar semana</button></form>`);$('#sched-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),now=new Date(),dow=now.getDay()||7;now.setDate(now.getDate()-dow+1);const week=now.toISOString().slice(0,10),rows=names.map((_,i)=>({worker_id:id,week_start:week,day_of_week:i+1,is_workday:f.has('d'+(i+1)),start_time:f.has('d'+(i+1))?f.get('s'+(i+1)):null,end_time:f.has('d'+(i+1))?f.get('e'+(i+1)):null,break_minutes:60}));const {error}=await db.from('schedules').upsert(rows,{onConflict:'worker_id,week_start,day_of_week'});if(error)return toast(error.message,true);$('#modal').remove();toast('Horario guardado.');schedules()}}
async function payroll(){
  const admin=state.profile.app_role==='admin';if(admin)await getWorkers();
  let q=db.from('payroll_items').select('*,workers(full_name),payroll_periods(*)');if(!admin)q=q.eq('worker_id',state.profile.worker_id);
  const {data}=await q;
  $('#view').innerHTML=`${admin?'<div class="section-head"><h2>Planillas</h2><button onclick="preparePayroll()">Preparar planilla</button></div>':'<div class="section-head"><h2>Mis pagos</h2></div>'}<div class="notice"><b>Régimen de microempresa:</b> no se calculan CTS, gratificaciones legales ni asignación familiar. La bonificación extraordinaria es voluntaria y su monto lo decide la empresa.</div><div class="table-wrap"><table><thead><tr><th>Periodo</th><th>Trabajador</th><th>Base</th><th>Horas extra</th><th>Bono voluntario</th><th>Descuentos</th><th>Pensión</th><th>Neto</th><th>Estado</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${date(x.payroll_periods.start_date)}–${date(x.payroll_periods.end_date)}</td><td>${esc(x.workers.full_name)}</td><td>${money(x.base_amount)}</td><td>${money(x.overtime_amount)}</td><td>${money(x.bonuses)}${admin?`<br><button onclick="setVoluntaryBonus(${x.id},${Number(x.bonuses||0)},${Number(x.net_amount||0)})">Editar bono</button>`:''}</td><td>${money(x.attendance_discount+x.manual_discount)}</td><td>${money(x.pension_discount)}</td><td><b>${money(x.net_amount)}</b></td><td><span class="badge info">${esc(statusLabel(x.payroll_periods.status))}</span></td></tr>`).join('')||'<tr><td colspan="9" class="empty">Aún no hay boletas generadas.</td></tr>'}</tbody></table></div>`;
}

async function preparePayroll(){
  const start=prompt('Inicio del periodo (AAAA-MM-DD):',new Date().toISOString().slice(0,8)+'01'),end=prompt('Fin del periodo (AAAA-MM-DD):',new Date().toISOString().slice(0,10));
  if(!start||!end)return;
  await getWorkers();
  const {data:period,error:pe}=await db.from('payroll_periods').upsert({start_date:start,end_date:end,payment_date:end,frequency:'quincenal',status:'preparing'},{onConflict:'start_date,end_date,frequency'}).select().single();
  if(pe)return toast(pe.message,true);
  const [{data:a},{data:previousItems},{data:settings}]=await Promise.all([db.from('attendance').select('*').gte('work_date',start).lte('work_date',end),db.from('payroll_items').select('*').eq('period_id',period.id),db.from('company_settings').select('overtime_factor,overtime_factor_after_two_hours').eq('id',1).single()]);
  const previous=new Map((previousItems||[]).map(x=>[x.worker_id,x])),firstFactor=Number(settings?.overtime_factor||1.25),laterFactor=Number(settings?.overtime_factor_after_two_hours||1.35);
  const items=state.workers.filter(w=>w.active).map(w=>{
    const days=(a||[]).filter(x=>x.worker_id===w.id&&x.review_status!=='justified'),old=previous.get(w.id),base=w.payment_frequency==='quincenal'?w.base_salary/2:w.base_salary,minute=w.base_salary/30/8/60,bonuses=Number(old?.bonuses||0),manual_discount=Number(old?.manual_discount||0);
    const attendance_discount=days.reduce((s,x)=>s+(x.status==='absent'?w.base_salary/30:(x.late_minutes+x.early_leave_minutes)*minute),0);
    const overtime_amount=days.reduce((s,x)=>{const m=x.approved_overtime_minutes||0;return s+Math.min(m,120)*minute*firstFactor+Math.max(0,m-120)*minute*laterFactor},0);
    const pension_discount=w.payment_type==='microempresa'?base*w.pension_rate/100:0;
    return{period_id:period.id,worker_id:w.id,base_amount:base,family_allowance:0,overtime_amount,bonuses,manual_discount,adjustment_note:old?.adjustment_note||null,attendance_discount,pension_discount,discounts:attendance_discount+manual_discount+pension_discount,net_amount:base+overtime_amount+bonuses-attendance_discount-manual_discount-pension_discount};
  });
  const {error}=await db.from('payroll_items').upsert(items,{onConflict:'period_id,worker_id'});
  toast(error?error.message:'Planilla preparada correctamente.',!!error);payroll();
}

async function setVoluntaryBonus(id,current,net){
  const value=prompt('Monto de la bonificación extraordinaria voluntaria:',String(current||0));
  if(value===null)return;
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0)return toast('Ingresa un monto válido.',true);
  const note=prompt('Motivo de la bonificación (decisión de la empresa):','Bonificación extraordinaria voluntaria')||'Bonificación extraordinaria voluntaria';
  const {error}=await db.from('payroll_items').update({bonuses:amount,adjustment_note:note,net_amount:Number(net)-Number(current||0)+amount}).eq('id',id);
  toast(error?error.message:'Bonificación voluntaria actualizada.',!!error);payroll();
}
async function requests(){const admin=state.profile.app_role==='admin';let q=db.from('requests').select('*,workers(full_name)').order('created_at',{ascending:false});if(!admin)q=q.eq('worker_id',state.profile.worker_id);const {data,error}=await q;if(error)throw error;$('#view').innerHTML=`<div class="section-head"><h2>${admin?'Solicitudes del personal':'Mis solicitudes'}</h2>${admin?'':'<button onclick="requestForm()">+ Nueva solicitud</button>'}</div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Trabajador</th><th>Tipo</th><th>Detalle</th><th>Estado</th><th></th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${date(x.occurrence_date)}</td><td>${esc(x.workers?.full_name||'')}</td><td>${esc(x.type)}</td><td>${esc(x.detail)}</td><td><span class="badge ${x.status==='approved'?'ok':x.status==='rejected'?'danger':''}">${esc(statusLabel(x.status))}</span></td><td>${admin&&x.status==='pending'?`<div class="actions"><button onclick="resolveRequest(${x.id},'approved')">Aprobar</button><button class="danger-btn" onclick="resolveRequest(${x.id},'rejected')">Rechazar</button></div>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No hay solicitudes.</td></tr>'}</tbody></table></div>`}
function requestForm(){modal(`<h2>Nueva solicitud</h2><form id="req"><label>Tipo<select name="type"><option>Permiso</option><option>Justificación de falta</option><option>Justificación de tardanza</option><option>Vacaciones</option></select></label><label>Fecha<input type="date" name="occurrence_date" required></label><label>Detalle<textarea name="detail" required></textarea></label><button>Enviar solicitud</button></form>`);$('#req').onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.worker_id=state.profile.worker_id;const {error}=await db.from('requests').insert(o);if(error)return toast(error.message,true);$('#modal').remove();toast('Solicitud enviada.');requests()}}
async function resolveRequest(id,status){const note=prompt('Nota del administrador:')||'';const {error}=await db.from('requests').update({status,admin_note:note,reviewed_at:new Date().toISOString(),reviewed_by:state.session.user.id}).eq('id',id);toast(error?error.message:'Solicitud resuelta.',!!error);requests()}
