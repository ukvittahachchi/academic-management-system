import React, { useState } from 'react';
import { Plus, Trash, Check, AlertCircle } from 'lucide-react';

export interface QuestionData {
    id?: string; // temporary id for frontend key
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
            alert('Please fill in required fields (Question, Options A & B, Correct Answer)');
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Assignment Questions</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Question List ({questions.length})
                    </button>
                    <button
                        onClick={() => { resetForm(); setActiveTab('add'); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'add' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Plus className="w-4 h-4 inline mr-1" /> Add Question
                    </button>
                </div>
            </div>

            {activeTab === 'add' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text *</label>
                        <textarea
                            value={formData.question_text}
                            onChange={e => setFormData({ ...formData, question_text: e.target.value })}
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                            placeholder="Type your question here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={formData.question_type}
                                onChange={e => setFormData({ ...formData, question_type: e.target.value as any })}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="single">Single Choice</option>
                                <option value="multiple">Multiple Choice</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                            <input
                                type="number"
                                value={formData.marks}
                                onChange={e => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded-md"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700">Options</p>
                        {['a', 'b', 'c', 'd', 'e'].map((opt) => (
                            <div key={opt} className="flex items-center space-x-2">
                                <span className="uppercase text-sm font-bold text-gray-500 w-6">{opt}</span>
                                <input
                                    type="text"
                                    value={(formData as any)[`option_${opt}`]}
                                    onChange={e => setFormData({ ...formData, [`option_${opt}`]: e.target.value })}
                                    className="flex-1 p-2 border rounded-md text-sm"
                                    placeholder={`Option ${opt.toUpperCase()} ${opt === 'e' ? '(Optional)' : '*'}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correct Answer(s) * <span className="text-xs text-gray-500 font-normal">(e.g., A or A,C)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.correct_answers}
                            onChange={e => setFormData({ ...formData, correct_answers: e.target.value.toUpperCase() })}
                            className="w-full p-2 border rounded-md uppercase"
                            placeholder="A"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (Optional)</label>
                        <textarea
                            value={formData.explanation}
                            onChange={e => setFormData({ ...formData, explanation: e.target.value })}
                            className="w-full p-2 border rounded-md min-h-[60px]"
                            placeholder="Explain why the answer is correct..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            onClick={() => setActiveTab('list')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm"
                        >
                            {editingId ? 'Update Question' : 'Add Question'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
                            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                            <p>No questions derived yet.</p>
                            <button
                                onClick={() => setActiveTab('add')}
                                className="mt-2 text-indigo-600 hover:underline"
                            >
                                Add your first question
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q, idx) => (
                                <div key={q.id || idx} className="p-4 border border-gray-100 rounded-lg hover:border-indigo-100 hover:shadow-sm transition-all bg-white relative group">
                                    <div className="absolute right-3 top-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(q)}
                                            className="p-1 text-gray-400 hover:text-indigo-600"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id!)}
                                            className="p-1 text-gray-400 hover:text-red-600"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-3 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 mb-1">{q.question_text}</p>
                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">{q.question_type}</span>
                                                <span>{q.marks} Marks</span>
                                                <span className="text-green-600 font-medium">Answer: {q.correct_answers}</span>
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
