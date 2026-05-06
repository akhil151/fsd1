import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseBulkQuestions } from "@/lib/parseBulkQuestions";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
}

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function CreateQuizModal({ isOpen, onClose, onSubmit }: CreateQuizModalProps) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      difficulty: "intermediate",
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [mode, setMode] = useState<"manual" | "bulk">("manual");
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: String(questions.length + 1),
        text: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        difficulty: "intermediate",
      },
    ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, questions });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            data-testid="modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.form
              onSubmit={handleSubmit}
              className="glass-panel rounded-xl border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-y-auto pointer-events-auto relative"
            >
              {/* Header */}
              <div className="sticky top-0 flex justify-between items-center px-6 py-4 border-b border-white/10 bg-background/50 backdrop-blur-sm z-20">
                <h2 className="text-lg font-display font-black text-white tracking-widest">CREATE NEW QUIZ</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="btn-close-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">

                {/* Step 1: Quiz Title */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <label className="block text-[10px] uppercase font-display font-bold tracking-widest text-muted-foreground">
                      Quiz Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Biology Fundamentals"
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all text-base"
                      data-testid="input-quiz-title"
                    />
                  </motion.div>
                )}

                {/* Step 2: Questions */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setMode("manual")}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-display uppercase tracking-[0.2em] transition-colors ${
                          mode === "manual"
                            ? "bg-white text-black"
                            : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        Manual Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("bulk")}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-display uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 transition-colors ${
                          mode === "bulk"
                            ? "bg-secondary text-black"
                            : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        Bulk Paste
                      </button>
                    </div>

                    {mode === "bulk" && (
                      <div className="space-y-4">
                        {/* Format Instructions */}
                        <div className="glass-panel rounded-lg border border-white/15 p-4 bg-black/40">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-secondary font-display mb-1.5">
                            Format Guide
                          </p>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Paste questions using the pattern below:
                          </p>
                          <pre className="text-[10px] leading-relaxed bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-white/80 overflow-x-auto">
{`Q: What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B`}
                          </pre>
                        </div>

                        {/* Bulk Textarea */}
                        <textarea
                          value={bulkText}
                          onChange={(e) => {
                            setBulkText(e.target.value);
                            setBulkError(null);
                          }}
                          placeholder="Paste questions here..."
                          rows={10}
                          className="w-full bg-black/60 border border-secondary/40 rounded-xl p-4 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all font-mono"
                        />

                        {bulkError && (
                          <div className="text-[10px] text-destructive whitespace-pre-line border border-destructive/40 bg-destructive/10 rounded-lg p-2.5">
                            {bulkError}
                          </div>
                        )}

                        <Button
                          type="button"
                          onClick={() => {
                            try {
                              const parsed = parseBulkQuestions(bulkText);
                              if (!parsed.length) {
                                setBulkError("No questions detected. Please check the format.");
                                return;
                              }
                              setBulkError(null);

                              const mapped: Question[] = parsed.map((q, idx) => ({
                                id: String(idx + 1),
                                text: q.text,
                                options: q.options,
                                correctAnswer: q.correctAnswer,
                                difficulty: "intermediate",
                              }));

                              setQuestions(mapped);
                              setMode("manual");
                            } catch (err: any) {
                              setBulkError(err?.message || "Failed to parse questions.");
                            }
                          }}
                          className="w-full bg-gradient-to-r from-primary via-accent to-secondary text-white font-display uppercase tracking-[0.2em] text-[10px] h-10"
                        >
                          Generate Question Set
                        </Button>
                      </div>
                    )}

                    {/* Manual Entry Builder */}
                    {mode === "manual" && questions.map((question, qIndex) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/30 rounded-lg p-5 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-[10px] font-display font-bold text-white uppercase tracking-wider">
                            Question {qIndex + 1}
                          </h4>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors text-destructive"
                              data-testid={`btn-delete-question-${question.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Question Text */}
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) =>
                            handleUpdateQuestion(question.id, { text: e.target.value })
                          }
                          placeholder="Question text..."
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all mb-3 text-xs"
                          data-testid={`input-question-${question.id}`}
                        />

                        {/* Options */}
                        <div className="space-y-1.5">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === oIndex}
                                onChange={() =>
                                  handleUpdateQuestion(question.id, {
                                    correctAnswer: oIndex,
                                  })
                                }
                                className="w-3.5 h-3.5 accent-secondary"
                                data-testid={`radio-option-${question.id}-${oIndex}`}
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options];
                                  newOptions[oIndex] = e.target.value;
                                  handleUpdateQuestion(question.id, {
                                    options: newOptions,
                                  });
                                }}
                                placeholder={`Option ${oIndex + 1}`}
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg py-1.5 px-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all text-[11px]"
                                data-testid={`input-option-${question.id}-${oIndex}`}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Difficulty */}
                        <div className="mt-3">
                          <label className="block text-[9px] uppercase font-semibold tracking-widest text-muted-foreground mb-1.5">
                            Difficulty
                          </label>
                          <select
                            value={question.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestion(question.id, {
                                difficulty: e.target.value,
                              })
                            }
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-1.5 px-3 text-white focus:outline-none focus:border-secondary transition-all text-[11px]"
                            data-testid={`select-difficulty-${question.id}`}
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                          </select>
                        </div>
                      </motion.div>
                    ))}

                    {/* Add Question Button */}
                    <Button
                      type="button"
                      onClick={handleAddQuestion}
                      variant="outline"
                      className="w-full border-dashed border-white/20 hover:border-white/40 h-9 text-[10px] uppercase tracking-widest"
                      data-testid="btn-add-question"
                    >
                      <Plus className="w-3 h-3 mr-1.5" />
                      Add Question
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex gap-3 px-6 py-4 border-t border-white/10 bg-background/50 backdrop-blur-sm z-20">
                {currentStep === 1 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    variant="outline"
                    className="flex-1 border-white/20 hover:border-white/50 h-10 text-[10px] uppercase tracking-widest"
                    data-testid="btn-previous-step"
                  >
                    Back
                  </Button>
                )}
                {currentStep === 0 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={!title}
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-background h-10 text-[10px] font-black uppercase tracking-widest"
                    data-testid="btn-next-step"
                  >
                    Continue
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    type="submit"
                    disabled={!title || questions.some((q) => !q.text || q.options.some((o) => !o))}
                    className="flex-1 bg-white hover:bg-white/90 text-background h-10 text-[10px] font-black uppercase tracking-widest"
                    data-testid="btn-create-quiz-submit"
                  >
                    Create Quiz
                  </Button>
                )}
              </div>
            </motion.form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
