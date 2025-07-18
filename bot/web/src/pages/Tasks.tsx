// Страница списка задач
import React from "react";
import { useToast } from "../context/useToast";
import authFetch from "../utils/authFetch";
import Spinner from "../components/Spinner";
import SkeletonCard from "../components/SkeletonCard";
import Pagination from "../components/Pagination";
import Breadcrumbs from "../components/Breadcrumbs";

interface Task {
  _id: string;
  task_description: string;
}

export default function Tasks() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [posting, setPosting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const perPage = 10;
  const { addToast } = useToast();


  React.useEffect(() => {
    authFetch("/api/v1/tasks")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    const res = await authFetch("/api/v1/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: text, task_description: text }),
    });
    if (res.ok) {
      setText("");
      addToast("Задача создана");
      setTasks(await res.json().then((t) => [...tasks, t]));
    }
    setPosting(false);
  };

  const totalPages = Math.ceil(tasks.length / perPage);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Задачи", href: "/tasks" },
          { label: "Задачи" },
        ]}
      />
      <h2 className="text-xl font-semibold">Задачи</h2>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          className="focus:border-accentPrimary h-10 flex-1 rounded-lg border border-gray-300 bg-gray-100 px-3 text-sm placeholder-gray-500 focus:outline-none"
          placeholder="Описание"
        />
        <button
          type="submit"
          className="btn btn-blue flex items-center justify-center"
        >
          {posting ? <Spinner /> : "Создать"}
        </button>
      </form>
      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          <ul className="space-y-2">
            {tasks.slice((page - 1) * 10, page * 10).map((t) => (
              <li
                key={t._id}
                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
              >
                {t.task_description}
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <Pagination total={totalPages} page={page} onChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
