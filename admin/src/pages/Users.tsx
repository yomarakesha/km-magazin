import { useState } from "react";
import { api, type Role, type User } from "../api";
import { ROLE_LABEL, useAuth } from "../auth";
import { Badge, Button, Card, Check, ErrorBox, Field, Input, Loaded, Modal, PageHead, Select, confirmAction, dateOnly, useAction, useLoad } from "../ui";

const ROLE_HINT: Record<Role, string> = {
  owner: "Полный доступ, цены, сотрудники",
  sales: "Заказы, касса, заявки, промокоды",
  warehouse: "Остатки, приход, закупки, штрихкоды",
  content: "Тексты и фото товаров, категории, бренды, отзывы",
};

export default function Users() {
  const { me } = useAuth();
  const state = useLoad(api.users);
  const [edit, setEdit] = useState<User | "new" | null>(null);
  if (me?.role !== "owner") return <ErrorBox error="Раздел доступен только владельцу" />;

  return (
    <>
      <PageHead title="Сотрудники" sub="Доступы к админ-панели" actions={<Button onClick={() => setEdit("new")}>+ Сотрудник</Button>} />
      <Card flush>
        <Loaded state={state}>
          {(list) => (
            <table className="table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Роль</th>
                  <th>Создан</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => setEdit(u)}>
                    <td className="title">
                      {u.username} {u.username === me.username && <span className="muted small">(вы)</span>}
                    </td>
                    <td>
                      <div>{ROLE_LABEL[u.role]}</div>
                      <div className="sub">{ROLE_HINT[u.role]}</div>
                    </td>
                    <td className="dim small">{dateOnly(u.created_at)}</td>
                    <td>{u.active ? <Badge tone="soft-green">Активен</Badge> : <Badge>Отключён</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Loaded>
      </Card>
      {edit && (
        <UserModal
          user={edit === "new" ? null : edit}
          self={edit !== "new" && edit.username === me.username}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            state.reload();
          }}
        />
      )}
    </>
  );
}

function UserModal({ user, self, onClose, onDone }: { user: User | null; self: boolean; onClose: () => void; onDone: () => void }) {
  const { busy, error, run } = useAction();
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "sales");
  const [active, setActive] = useState(user?.active ?? true);

  const save = async () => {
    const r = user
      ? await run(
          () =>
            api.updateUser(user.id, {
              ...(password ? { password } : {}),
              ...(role !== user.role ? { role } : {}),
              ...(active !== user.active ? { active } : {}),
            }),
          "Сохранено",
        )
      : await run(() => api.createUser({ username: username.trim(), password, role }), "Сотрудник добавлен");
    if (r) onDone();
  };
  const remove = async () => {
    if (user && confirmAction(`Удалить сотрудника ${user.username}?`) && (await run(() => api.deleteUser(user.id), "Удалено"))) onDone();
  };

  return (
    <Modal title={user ? user.username : "Новый сотрудник"} onClose={onClose}>
      {!user && (
        <Field label="Логин">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="off" />
        </Field>
      )}
      <Field label={user ? "Новый пароль" : "Пароль"} hint={user ? "Пусто — не менять" : "Не короче 8 символов"}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field label="Роль" hint={ROLE_HINT[role]}>
        <Select value={role} disabled={self} onChange={(e) => setRole(e.target.value as Role)}>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>
      {user && !self && (
        <Check checked={active} onChange={setActive}>
          Доступ разрешён
        </Check>
      )}
      <ErrorBox error={error} />
      <div className="form-actions">
        {user && !self && (
          <Button variant="danger" onClick={remove} disabled={busy}>
            Удалить
          </Button>
        )}
        <Button onClick={save} disabled={busy || (!user && (!username.trim() || !password))}>
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
