import React, { useState, useEffect } from 'react';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resetUserPassword,
} from '../../services/dataService';
import { User } from '../../db/types';
import { Plus, Edit2, Trash2, KeyRound, X, Check, AlertCircle } from 'lucide-react';

export const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<User | null>(null);
  const [resettingEmp, setResettingEmp] = useState<User | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({ name: '', empId: '', mobile: '', password: '1234' });
  const [editForm, setEditForm] = useState({ name: '', mobile: '', status: 'active' as 'active' | 'inactive' });
  const [newPwd, setNewPwd] = useState('1234');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!addForm.name.trim() || !addForm.empId.trim()) return;

    try {
      await createEmployee({
        employee_id: addForm.empId.trim(),
        full_name: addForm.name.trim(),
        mobile: addForm.mobile.trim() || '9876500000',
        password: addForm.password.trim() || '1234',
      });
      setFeedback({ type: 'success', message: `Employee "${addForm.name}" added.` });
      setIsAddOpen(false);
      setAddForm({ name: '', empId: '', mobile: '', password: '1234' });
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    setFeedback(null);

    try {
      await updateEmployee(editingEmp.id, {
        full_name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        status: editForm.status,
      });
      setFeedback({ type: 'success', message: 'Employee updated.' });
      setEditingEmp(null);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingEmp || !newPwd.trim()) return;

    try {
      await resetUserPassword(resettingEmp.id, newPwd.trim());
      setFeedback({ type: 'success', message: `Password reset for ${resettingEmp.full_name}.` });
      setResettingEmp(null);
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (emp: User) => {
    if (!window.confirm(`Remove employee ${emp.full_name}?`)) return;
    try {
      await deleteEmployee(emp.id);
      setFeedback({ type: 'success', message: `Employee removed.` });
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
        await loadData();
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">EMPLOYEE MANAGEMENT</h2>
          <p className="text-xs text-gray-400 mt-0.5">Staff list and login access</p>
        </div>

        <button
          onClick={() => {
            const nextId = `EMP${String(employees.length + 1).padStart(3, '0')}`;
            setAddForm({ name: '', empId: nextId, mobile: '', password: '1234' });
            setIsAddOpen(true);
          }}
          className="py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ADD</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SIMPLE LIST: Rajesh | EMP001 | Active */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading staff...</div>
        ) : (
          employees.map((emp) => (
            <div
              key={emp.id}
              className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-between gap-3 shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white truncate">{emp.full_name}</h3>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      emp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-400 font-bold">{emp.username}</span>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setResettingEmp(emp);
                    setNewPwd('1234');
                  }}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-400"
                  title="Reset Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setEditingEmp(emp);
                    setEditForm({ name: emp.full_name, mobile: emp.mobile, status: emp.status });
                  }}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-300"
                  title="Edit Employee"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(emp)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-red-600 hover:text-white text-gray-400"
                  title="Remove Employee"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 text-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-sm text-white">Add Employee</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Employee Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Ramesh"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={addForm.empId}
                    onChange={(e) => setAddForm({ ...addForm, empId: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-amber-400 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Password</label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black uppercase"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 text-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-sm text-white">Edit Employee</h3>
              <button onClick={() => setEditingEmp(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black uppercase"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 text-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-sm text-white">Reset Password</h3>
              <button onClick={() => setResettingEmp(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="mt-3 space-y-3 text-xs">
              <p className="text-gray-300">
                New password for <strong className="text-amber-400">{resettingEmp.full_name}</strong>:
              </p>
              <input
                type="text"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
                required
              />
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResettingEmp(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black uppercase"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
