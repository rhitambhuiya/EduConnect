import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Unlock,
  Calendar,
  FileCheck
} from 'lucide-react';
import { apiRequest, formatDateTime, formatTimeRemaining, formatFileSize } from '../../utils/api';

export default function StudentSubmitModal({ isOpen, onClose, assignment, onSubmitted }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !assignment) return null;

  const timer = formatTimeRemaining(assignment.dueDate);
  const isPastDue = timer.isExpired;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to submit (such as a PDF or document).');
      return;
    }

    if (isPastDue) {
      setError('The submission deadline has passed. Submissions are no longer accepted.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (notes.trim()) {
      formData.append('notes', notes.trim());
    }

    try {
      const res = await apiRequest(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: formData
      });
      if (onSubmitted) {
        onSubmitted(res.submission);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {assignment.classCode || 'Assignment Submission'}
              </span>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                timer.isExpired
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : timer.isUrgent
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{timer.text}</span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {assignment.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Due: {formatDateTime(assignment.dueDate)}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Re-upload policy alert */}
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            assignment.allowReupload
              ? 'bg-blue-50/70 border-blue-200 text-blue-800'
              : 'bg-amber-50/70 border-amber-200 text-amber-800'
          }`}>
            {assignment.allowReupload ? (
              <>
                <Unlock className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-semibold block">Re-uploads are allowed</span>
                  <span>You can delete and replace your submission any time before the deadline.</span>
                </div>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold block">One-time submission only</span>
                  <span>The instructor has locked re-uploads for this assignment. Make sure your file is final before uploading.</span>
                </div>
              </>
            )}
          </div>

          {/* File Picker / Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Upload Your Completed File (PDF, DOC, ZIP) <span className="text-red-500">*</span>
            </label>
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              file
                ? 'bg-blue-50/40 border-blue-400'
                : 'bg-slate-50/70 border-slate-300 hover:bg-blue-50/20 hover:border-blue-300'
            }`}>
              <div className="flex flex-col items-center justify-center p-4 text-center">
                {file ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-1.5 shadow-xs">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate max-w-xs block">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      {formatFileSize(file.size)} • Click to change file
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-600">
                      <span className="font-bold text-blue-600">Click to select PDF</span> or drag & drop file
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      PDF documents strongly recommended (up to 25MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0] || null)}
                disabled={isPastDue || submitting}
              />
            </label>
          </div>

          {/* Student comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Submission Remarks / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Completed all exercises, included extra credit question 4..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPastDue || submitting}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isPastDue || !file}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Assignment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
