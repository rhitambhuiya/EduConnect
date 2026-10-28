import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Calendar, Clock, Award, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { apiRequest, formatDateTime } from '../../utils/api';

export default function TeacherAssignmentModal({ isOpen, onClose, classId, assignment = null, onSaved }) {
  const isEditing = !!assignment;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalPoints, setTotalPoints] = useState(100);
  const [allowReupload, setAllowReupload] = useState(true);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Helper to format ISO date to datetime-local input string
  const toDatetimeLocal = (isoString) => {
    if (!isoString) {
      // Default: 7 days from now at 11:59 PM
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(23, 59, 0, 0);
      return d.toISOString().slice(0, 16);
    }
    const d = new Date(isoString);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (assignment) {
        setTitle(assignment.title || '');
        setDescription(assignment.description || '');
        setDueDate(toDatetimeLocal(assignment.dueDate));
        setTotalPoints(assignment.totalPoints || 100);
        setAllowReupload(assignment.allowReupload !== false);
        setFile(null);
      } else {
        setTitle('');
        setDescription('');
        setDueDate(toDatetimeLocal(null));
        setTotalPoints(100);
        setAllowReupload(true);
        setFile(null);
      }
    }
  }, [isOpen, assignment]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !dueDate) {
      setError('Please provide title, instructions, and a valid due date.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEditing) {
        // Edit existing assignment
        const res = await apiRequest(`/api/assignments/${assignment.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            dueDate: new Date(dueDate).toISOString(),
            totalPoints: Number(totalPoints),
            allowReupload: Boolean(allowReupload)
          })
        });
        if (onSaved) onSaved(res.assignment);
        onClose();
      } else {
        // Create new assignment
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('dueDate', new Date(dueDate).toISOString());
        formData.append('totalPoints', String(totalPoints));
        formData.append('allowReupload', String(allowReupload));
        if (file) {
          formData.append('file', file);
        }

        const res = await apiRequest(`/api/assignments/class/${classId}`, {
          method: 'POST',
          body: formData
        });
        if (onSaved) onSaved(res.assignment);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set assignment guidelines, specify a submission timeline, and control re-upload permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assignment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Homework 2: Binary Search Trees & Big-O Analysis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instructions & Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detail the expectations, formatting requirements, questions to answer, or what students need to include in their PDF submission..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Deadline / Due Date & Time <span className="text-red-500">*</span></span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Students cannot submit once this timeline passes.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Maximum Marks / Points</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900"
              />
            </div>
          </div>

          {/* Re-upload Toggle Setting */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReupload}
                onChange={(e) => setAllowReupload(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Allow students to delete and re-upload submissions before deadline
                </span>
                <span className="text-[11px] text-slate-500 leading-normal block mt-0.5">
                  When enabled, students can remove their uploaded file and resubmit as many times as needed before the deadline. You can also toggle this setting at any time.
                </span>
              </div>
            </label>
          </div>

          {/* Optional Attachment (for new assignments) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Optional Assignment Handout / Instructions File (PDF, Word, etc.)
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    {file ? (
                      <span className="text-xs font-semibold text-blue-600 truncate max-w-xs">
                        {file.name}
                      </span>
                    ) : (
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-blue-600">Click to upload</span> prompt document or drag & drop
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOC, DOCX, TXT up to 25MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Publish Assignment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
