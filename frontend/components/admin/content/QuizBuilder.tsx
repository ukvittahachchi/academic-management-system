import React, { useState } from 'react';
import { LuPlus, LuTrash2, LuCheck, LuCircleAlert, LuPencil } from 'react-icons/lu';
import { useToast } from '@/contexts/ToastContext';

export interface QuestionData {
    id?: string; // temporary id for frontend key
    question_id?: string | number; // Database ID for updates
    question_text: string;
    question_type: 'single' | 'multiple';
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string;
    correct_answers: string; // Comma separated, e.g. "A" or "A,C"
    marks: number;
    explanation: string;
    question_order: number;
}

interface QuizBuilderProps {
    questions: QuestionData[];
    onChange: (questions: QuestionData[]) => void;
}

const QuizBuilder: React.FC<QuizBuilderProps> = ({ questions, onChange }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<QuestionData>({
        question_text: '',
        question_type: 'single',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        correct_answers: '',
        marks: 5,
        explanation: '',
        question_order: questions.length + 1
    });

    const resetForm = () => {
        setFormData({
            question_text: '',
            question_type: 'single',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            option_e: '',
            correct_answers: '',
            marks: 5,
            explanation: '',
            question_order: questions.length + 1
        });
        setEditingId(null);
    };

    const handleAdd = () => {
        // Basic validation
        if (!formData.question_text || !formData.option_a || !formData.option_b || !formData.correct_answers) {
            showToast('Please fill in required fields (Question, Options A & B, Correct Answer)', 'error');
            return;
        }

        const newQuestion: QuestionData = {
            ...formData,
            id: editingId || `temp-${Date.now()}`,
            question_order: editingId ? formData.question_order : questions.length + 1
        };

        if (editingId) {
            onChange(questions.map(q => q.id === editingId ? newQuestion : q));
        } else {
            onChange([...questions, newQuestion]);
        }

        resetForm();
        setActiveTab('list');
    };

    const handleEdit = (q: QuestionData) => {
        setFormData(q);
        setEditingId(q.id!);
        setActiveTab('add');
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this question?')) {
            const updated = questions.filter(q => q.id !== id);
            // Reorder
            const reordered = updated.map((q, idx) => ({ ...q, question_order: idx + 1 }));
            onChange(reordered);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Assignment Questions</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        Question List ({questions.length})
                    </button>
                    <button
                        onClick={() => { resetForm(); setActiveTab('add'); }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'add' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <LuPlus className="w-4 h-4 mr-2" /> Add Question
                    </button>
                </div>
            </div>

            {activeTab === 'add' ? (
                <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Question Text *</label>
                        <textarea
                            value={formData.question_text}
                            onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium min-h-[100px]"
                            placeholder="Type your question here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                            <div className="relative">
                                <select
                                    value={formData.question_type}
                                    onChange={e => setFormData({ ...formData, question_type: e.target.value as any })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium appearance-none"
                                >
                                    <option value="single">Single Choice</option>
                                    <option value="multiple">Multiple Choice</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Marks</label>
                            <input
                                type="number"
                                value={formData.marks}
                                onChange={e => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <p className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Options</p>
                        {['a', 'b', 'c', 'd', 'e'].map((opt) => (
                            <div key={opt} className="flex items-center space-x-3">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${opt === 'e' ? 'bg-gray-100 text-gray-400' : 'bg-white border border-gray-200 text-gray-700'}`}>{opt.toUpperCase()}</span>
                                <input
                                    type="text"
                                    value={(formData as any)[`option_${opt}`]}
                                    onChange={e => setFormData({ ...formData, [`option_${opt}`]: e.target.value })}
                                    className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium text-sm transition-shadow"
                                    placeholder={`Option ${opt.toUpperCase()} ${opt === 'e' ? '(Optional)' : '*'}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Correct Answer(s) * <span className="normal-case font-normal text-gray-400 ml-1">(e.g., A or A,C)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.correct_answers}
                            onChange={e => setFormData({ ...formData, correct_answers: e.target.value.toUpperCase() })}
                            className="w-full p-3 bg-green-50/50 border border-green-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700 uppercase placeholder-green-300"
                            placeholder="A"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Explanation (Optional)</label>
                        <textarea
                            value={formData.explanation}
                            onChange={e => setFormData({ ...formData, explanation: e.target.value })}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium min-h-[80px]"
                            placeholder="Explain why the answer is correct..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setActiveTab('list')}
                            className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all transform active:scale-95"
                        >
                            {editingId ? 'Update Question' : 'Add Question'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LuCircleAlert className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="font-medium">No questions added yet.</p>
                            <button
                                onClick={() => setActiveTab('add')}
                                className="mt-3 text-purple-600 font-bold hover:underline"
                            >
                                Add your first question
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q, idx) => (
                                <div key={q.id || idx} className="p-5 border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all bg-white relative group">
                                    <div className="absolute right-4 top-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(q)}
                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Edit Question"
                                        >
                                            <LuPencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id!)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Question"
                                        >
                                            <LuTrash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-100 text-purple-700 text-sm font-bold mr-4 mt-0.5 shadow-sm">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1 pr-16">
                                            <p className="font-bold text-gray-900 mb-2 text-lg">{q.question_text}</p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-500">
                                                <span className="uppercase bg-gray-100 px-2 py-1 rounded-md tracking-wider text-gray-600">{q.question_type}</span>
                                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md">{q.marks} Marks</span>
                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center">
                                                    <LuCheck className="w-3 h-3 mr-1" /> Answer: {q.correct_answers}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuizBuilder;
