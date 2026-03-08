import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
              className="glass-panel rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto relative"
            >
              {/* Header */}
              <div className="sticky top-0 flex justify-between items-center px-8 py-6 border-b border-white/10 bg-background/50 backdrop-blur-sm">
                <h2 className="text-2xl font-display font-black text-white">CREATE NEW QUIZ</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="btn-close-modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-8">
                
                {/* Step 1: Quiz Title */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <label className="block text-sm uppercase font-display font-bold tracking-widest text-muted-foreground">
                      Quiz Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., React Fundamentals"
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all text-lg"
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
                    className="space-y-6"
                  >
                    {questions.map((question, qIndex) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/30 rounded-lg p-6 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                            Question {qIndex + 1}
                          </h4>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="p-1 hover:bg-destructive/20 rounded transition-colors text-destructive"
                              data-testid={`btn-delete-question-${question.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
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
                          className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all mb-4"
                          data-testid={`input-question-${question.id}`}
                        />

                        {/* Options */}
                        <div className="space-y-2">
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
                                className="w-4 h-4"
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
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-secondary transition-all text-sm"
                                data-testid={`input-option-${question.id}-${oIndex}`}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Difficulty */}
                        <div className="mt-4">
                          <label className="block text-xs uppercase font-semibold tracking-widest text-muted-foreground mb-2">
                            Difficulty
                          </label>
                          <select
                            value={question.difficulty}
                            onChange={(e) =>
                              handleUpdateQuestion(question.id, {
                                difficulty: e.target.value,
                              })
                            }
                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-secondary transition-all text-sm"
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
                      className="w-full border-dashed border-white/30 hover:border-white/50"
                      data-testid="btn-add-question"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 flex gap-4 px-8 py-6 border-t border-white/10 bg-background/50 backdrop-blur-sm">
                {currentStep === 1 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    variant="outline"
                    className="flex-1 border-white/20 hover:border-white/50"
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
                    className="flex-1 bg-secondary hover:bg-secondary/90 text-background"
                    data-testid="btn-next-step"
                  >
                    Continue
                  </Button>
                )}
                {currentStep === 1 && (
                  <Button
                    type="submit"
                    disabled={!title || questions.some((q) => !q.text || q.options.some((o) => !o))}
                    className="flex-1 bg-white hover:bg-white/90 text-background"
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
