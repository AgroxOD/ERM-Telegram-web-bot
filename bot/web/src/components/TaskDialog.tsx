// Общая форма создания и редактирования задач
import React, { useContext } from "react";
import { useSidebar } from "../context/useSidebar";
import RichTextEditor from "./RichTextEditor";
import MultiUserSelect from "./MultiUserSelect";
import { AuthContext } from "../context/AuthContext";
import fields from "../../../shared/taskFields.cjs";
import { createTask, updateTask, deleteTask } from "../services/tasks";
import authFetch from "../utils/authFetch";
import parseJwt from "../utils/parseJwt";
import parseGoogleAddress from "../utils/parseGoogleAddress";
import { validateURL } from "../utils/validation";
import extractCoords from "../utils/extractCoords";
import { expandLink } from "../services/maps";
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import fetchRoute from "../services/route";
import createRouteLink from "../utils/createRouteLink";

interface Props {
  onClose: () => void;
  onSave?: (data: any) => void;
  id?: string;
}

export default function TaskDialog({ onClose, onSave, id }: Props) {
  const isEdit = Boolean(id);
  const { user } = useContext(AuthContext);
  const { open, collapsed } = useSidebar();
  const isAdmin = React.useMemo(() => {
    const token = localStorage.getItem('token');
    const data = token ? parseJwt(token) : null;
    return Boolean((data as any)?.isAdmin);
  }, []);
  const [editing, setEditing] = React.useState(!isEdit);
  const [expanded, setExpanded] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);
  const [requestId,setRequestId]=React.useState('');
  const [created,setCreated]=React.useState('');
  const [title, setTitle] = React.useState("");
  const [taskType, setTaskType] = React.useState(fields.find(f=>f.name==='task_type')?.default||"");
  const [description, setDescription] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [priority, setPriority] = React.useState(fields.find(f=>f.name==='priority')?.default||"");
  const [transportType, setTransportType] = React.useState(fields.find(f=>f.name==='transport_type')?.default||"");
  const [paymentMethod, setPaymentMethod] = React.useState(fields.find(f=>f.name==='payment_method')?.default||"");
  const [status, setStatus] = React.useState(fields.find(f=>f.name==='status')?.default||"");
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [controllers, setControllers] = React.useState<string[]>([]);
  const [department, setDepartment] = React.useState("");
  const [creator, setCreator] = React.useState("");
  const [assignees, setAssignees] = React.useState<string[]>([]);
  const [start, setStart] = React.useState("");
  const [startLink, setStartLink] = React.useState("");
  const [startCoordinates, setStartCoordinates] = React.useState<{lat:number,lng:number}|null>(null);
  const [end, setEnd] = React.useState("");
  const [endLink, setEndLink] = React.useState("");
  const [finishCoordinates, setFinishCoordinates] = React.useState<{lat:number,lng:number}|null>(null);
  const types = fields.find(f=>f.name==='task_type')?.options || [];
  const priorities = fields.find(f=>f.name==='priority')?.options || [];
  const transports = fields.find(f=>f.name==='transport_type')?.options || [];
  const payments = fields.find(f=>f.name==='payment_method')?.options || [];
  const statuses = fields.find(f=>f.name==='status')?.options || [];
  const [users,setUsers]=React.useState<any[]>([]);
  const [departments,setDepartments]=React.useState<any[]>([]);
  const [attachments,setAttachments]=React.useState<any[]>([]);
  const [files,setFiles]=React.useState<FileList|null>(null);
  const [distanceKm,setDistanceKm]=React.useState<number|null>(null);
  const [routeLink,setRouteLink]=React.useState('');

  React.useEffect(()=>{
    setEditing(!isEdit)
    if(isEdit&&id){
      authFetch(`/api/v1/tasks/${id}`).then(r=>r.ok?r.json():null).then(t=>{
        if(!t) return;
        setRequestId(t.request_id);
        setCreated(new Date(t.createdAt).toISOString().slice(0,10));
      });
    }else{
      setCreated(new Date().toISOString().slice(0,10));
      authFetch('/api/v1/tasks/report/summary')
        .then(r=>r.ok?r.json():{count:0})
        .then(s=>{
          const num=String((s.count||0)+1).padStart(6,'0');
          setRequestId(`ERM_${num}`);
        });
    }
  },[id,isEdit]);

  React.useEffect(()=>{
    authFetch('/api/v1/users')
      .then(r=>r.ok?r.json():[])
      .then(list=>{setUsers(list);if(user) setCreator(user.telegram_id);});
    // данные ролей и групп могут потребоваться позднее
    authFetch('/api/v1/departments')
      .then(r=>r.ok?r.json():[])
      .then(setDepartments);
  },[user]);


  React.useEffect(() => {
    if(!isEdit||!id) return;
    authFetch(`/api/v1/tasks/${id}`).then(r=>r.ok?r.json():null).then(t=>{
      if(!t) return;
      setTitle(t.title||"");
      setTaskType(t.task_type||taskType);
      setDescription(t.task_description||"");
      setComment(t.comment||"");
      setPriority(t.priority||priority);
      setTransportType(t.transport_type||transportType);
      setPaymentMethod(t.payment_method||paymentMethod);
      setStatus(t.status||status);
      setDepartment(t.departmentId||"");
      setCreator(String(t.created_by||""));
      setAssignees(t.assignees||[]);
      setStart(t.start_location||"");
      setStartLink(t.start_location_link||"");
      setEnd(t.end_location||"");
      setEndLink(t.end_location_link||"");
      setStartDate(t.start_date?new Date(t.start_date).toISOString().slice(0,16):"");
      setDueDate(t.due_date?new Date(t.due_date).toISOString().slice(0,16):"");
      setControllers(t.controllers||[]);
      setAttachments(t.attachments||[]);
      setDistanceKm(typeof t.route_distance_km==='number'?t.route_distance_km:null);
    });
  }, [id, isEdit]);


  const handleStartLink=async(v:string)=>{
    setStartLink(v);
    const url=validateURL(v);
    if(url){
      let link=url;
      if(/^https?:\/\/maps\.app\.goo\.gl\//i.test(url)){
        const data=await expandLink(url);
        if(data){link=data.url;}
      }
      setStart(parseGoogleAddress(link));
      setStartCoordinates(extractCoords(link));
      setStartLink(link);
    } else {setStart('');setStartCoordinates(null);}
  };

  const handleEndLink=async(v:string)=>{
    setEndLink(v);
    const url=validateURL(v);
    if(url){
      let link=url;
      if(/^https?:\/\/maps\.app\.goo\.gl\//i.test(url)){
        const data=await expandLink(url);
        if(data){link=data.url;}
      }
      setEnd(parseGoogleAddress(link));
      setFinishCoordinates(extractCoords(link));
      setEndLink(link);
    } else {setEnd('');setFinishCoordinates(null);}
  };

  React.useEffect(()=>{
    if(startCoordinates&&finishCoordinates){
      setRouteLink(createRouteLink(startCoordinates,finishCoordinates));
      fetchRoute(startCoordinates,finishCoordinates).then(r=>{
        if(r){
          setDistanceKm(Number((r.distance/1000).toFixed(1)));
        }
      });
    } else {
      setDistanceKm(null);
      setRouteLink('');
    }
  },[startCoordinates,finishCoordinates]);

  const submit=async()=>{
    const payload:{[key:string]:any}={
      title,
      task_type:taskType,
      task_description:description,
      comment,
      priority,
      transport_type:transportType,
      payment_method:paymentMethod,
      status,
      departmentId:department||undefined,
      created_by:creator,
      assignees,
      controllers,
      start_location:start,
      start_location_link:startLink,
      end_location:end,
      end_location_link:endLink,
      start_date:startDate||undefined,
      due_date:dueDate||undefined,
      files:files?Array.from(files).map(f=>f.name):undefined
    };
    if(startCoordinates) payload.startCoordinates=startCoordinates;
    if(finishCoordinates) payload.finishCoordinates=finishCoordinates;
    if(distanceKm!==null) payload.route_distance_km=distanceKm;
    if(routeLink) payload.google_route_url=routeLink;
    let data;
    if(isEdit&&id){data=await updateTask(id,payload);}else{data=await createTask(payload);} 
    if(data&&onSave) onSave(data);
    onClose();
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Вы точно хотите удалить задачу?')) return;
    await deleteTask(id);
    if (onSave) onSave(null);
    onClose();
  };

  return(
    <div
      className={`bg-opacity-30 animate-fade-in fixed right-0 top-14 bottom-0 flex items-start justify-center overflow-y-auto bg-black z-50 ${open ? (collapsed ? 'lg:left-20' : 'lg:left-60') : 'lg:left-0'}`}
    >
      <div className={`w-full ${expanded ? 'max-w-screen-xl' : 'max-w-screen-md'} ${minimized ? 'max-h-10' : 'max-h-[90vh]'} overflow-y-auto space-y-4 rounded-xl bg-white p-6 shadow-lg mx-auto`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Задача - {requestId} {created}</h3>
        <div className="flex space-x-2">
          {isEdit && !editing && (
            <button onClick={() => setEditing(true)} className="p-1" title="Редактировать">
              ✎
            </button>
          )}
          <button onClick={() => setMinimized(!minimized)} className="p-1" title="Свернуть">
            <MinusIcon className="h-5 w-5" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1" title="Развернуть">
            {expanded ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
          </button>
          <button onClick={onClose} className="p-1" title="Закрыть">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {!minimized && (
      <>
      <div>
        <label className="block text-sm font-medium">Название задачи</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название" className="w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm focus:border-accentPrimary focus:outline-none focus:ring focus:ring-brand-200" disabled={!editing} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Дата начала</label>
          <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing} />
        </div>
        <div>
          <label className="block text-sm font-medium">Срок выполнения</label>
          <input type="datetime-local" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Статус</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            {statuses.map(s=>(<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Приоритет</label>
          <select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            {priorities.map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Отдел</label>
          <select value={department} onChange={e=>setDepartment(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            <option value="">Отдел</option>
            {departments.map(d=>(<option key={d._id} value={d._id}>{d.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Тип задачи</label>
          <select value={taskType} onChange={e=>setTaskType(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            {types.map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Задачу создал</label>
          <select value={creator} onChange={e=>setCreator(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            <option value="">автор</option>
            {users.map(u=>(<option key={u.telegram_id} value={u.telegram_id}>{u.name||u.username}</option>))}
          </select>
        </div>
        <MultiUserSelect
          label="Исполнител(и)ь"
          users={users}
          value={assignees}
          onChange={setAssignees}
          disabled={!editing}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Старт точка</label>
          {startLink ? (
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <a href={startLink} target="_blank" rel="noopener" className="text-accentPrimary underline">
                  {start || 'ссылка'}
                </a>
                {startCoordinates && (
                  <span className="text-xs text-gray-600">{startCoordinates.lat},{startCoordinates.lng}</span>
                )}
              </div>
              {editing && (
                <button type="button" onClick={() => handleStartLink('')} className="text-red-600">✖</button>
              )}
            </div>
          ) : (
            <div className="mt-1 flex space-x-2">
              <input
                value={startLink}
                onChange={e => handleStartLink(e.target.value)}
                placeholder="Ссылка из Google Maps"
                className="flex-1 rounded border px-2 py-1"
                disabled={!editing}
              />
              <a
                href="https://maps.app.goo.gl/xsiC9fHdunCcifQF6"
                target="_blank"
                rel="noopener"
                className="btn-blue rounded-2xl px-3"
              >
                Карта
              </a>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Финальная точка</label>
          {endLink ? (
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <a href={endLink} target="_blank" rel="noopener" className="text-accentPrimary underline">
                  {end || 'ссылка'}
                </a>
                {finishCoordinates && (
                  <span className="text-xs text-gray-600">{finishCoordinates.lat},{finishCoordinates.lng}</span>
                )}
              </div>
              {editing && (
                <button type="button" onClick={() => handleEndLink('')} className="text-red-600">✖</button>
              )}
            </div>
          ) : (
            <div className="mt-1 flex space-x-2">
              <input
                value={endLink}
                onChange={e => handleEndLink(e.target.value)}
                placeholder="Ссылка из Google Maps"
                className="flex-1 rounded border px-2 py-1"
                disabled={!editing}
              />
              <a
                href="https://maps.app.goo.gl/xsiC9fHdunCcifQF6"
                target="_blank"
                rel="noopener"
                className="btn-blue rounded-2xl px-3"
              >
                Карта
              </a>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Тип транспорта</label>
          <select value={transportType} onChange={e=>setTransportType(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            {transports.map(t=>(<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Способ оплаты</label>
          <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="w-full rounded border px-2 py-1" disabled={!editing}>
            {payments.map(p=>(<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {distanceKm!==null&&(
          <div>
            <label className="block text-sm font-medium">Расстояние</label>
            <p>{distanceKm} км</p>
          </div>
        )}
        {routeLink&&(
          <div>
            <label className="block text-sm font-medium">Маршрут</label>
            <a href={routeLink} target="_blank" rel="noopener" className="text-accentPrimary underline">ссылка</a>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium">🔨 Задача</label>
        <RichTextEditor value={description} onChange={setDescription} readOnly={!editing} />
      </div>
      <div>
        <label className="block text-sm font-medium">Комментарий</label>
        <RichTextEditor value={comment} onChange={setComment} readOnly={!editing} />
      </div>
        <MultiUserSelect
          label="Контролёр"
          users={users}
          value={controllers}
          onChange={setControllers}
          disabled={!editing}
        />
        {attachments.length>0&&(
          <div>
            <label className="block text-sm font-medium">Вложения</label>
            <ul className="list-disc pl-4">
              {attachments.map(a=>(<li key={a.url}><a href={a.url} target="_blank" rel="noopener" className="text-accentPrimary underline">{a.name}</a></li>))}
            </ul>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Прикрепить файл</label>
          <input type="file" multiple className="mt-1 w-full" onChange={e=>setFiles(e.target.files)} disabled={!editing} />
        </div>
        <div className="flex justify-end space-x-2">
          {isEdit && isAdmin && editing && (
            <button className="btn-red rounded-full" onClick={handleDelete}>Удалить</button>
          )}
          <button className="btn-gray rounded-full" onClick={onClose}>Отмена</button>
          {editing && (
            <button className="btn-blue rounded-full" onClick={submit}>{isEdit?'Сохранить':'Создать'}</button>
          )}
        </div>
      </>
      )}
    </div>
  </div>
  );
}
