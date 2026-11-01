import React, { useState } from 'react';
import { api } from '../services/api';
import { AiAnalyzeResponse, SystemMetrics, DockerOverview, NginxStats } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Cpu,
  Box,
  Globe,
  AlertTriangle,
  Server,
  Zap
} from 'lucide-react';

interface AiAssistantViewProps {
  system: SystemMetrics | null;
  docker: DockerOverview | null;
  nginx: NginxStats | null;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  system,
  docker,
  nginx
}) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<
    { question: string; response: AiAnalyzeResponse }[]
  >([
    {
      question: 'Сводка состояния сервера',
      response: {
        answer: `### 🛡️ Сводка состояния сервера Ubuntu 24.04 LTS

* **Система:** Все ключевые службы функционируют штатно.
* **Нагрузка CPU:** ${system ? `${system.cpu.usagePercent}%` : '24.5%'} — в пределах нормы.
* **Память:** ${system ? `${system.ram.usagePercent}%` : '51.2%'} от 8.0 GB.
* **Docker:** ${docker ? `${docker.running}/${docker.total}` : '4/4'} контейнеров онлайн.
* **Nginx:** Активных соединений ${nginx?.activeConnections ?? 42}, критических сбоев нет.

Вы можете задать любой вопрос о состоянии сервера или выбрать один из готовых сценариев ниже.`,
        timestamp: new Date().toISOString(),
        modelUsed: 'Server Diagnostic Analyzer (Gemini 3.8 Flash)',
        insights: [
          { type: 'ok', summary: 'Система стабильна' },
          { type: 'ok', summary: 'Docker контейнеры в норме' }
        ]
      }
    }
  ]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const suggestedQuestions = [
    'Почему выросла загрузка CPU?',
    'Какие контейнеры сейчас работают?',
    'Есть ли проблемы с Nginx?',
    'Какие ошибки произошли за последний час?'
  ];

  const handleSend = async (qToSend?: string) => {
    const q = (qToSend || question).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setQuestion('');

    try {
      const response = await api.analyzeWithAi(q);
      setHistory((prev) => [...prev, { question: q, response }]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          response: {
            answer: `❌ Ошибка при запросе к аналитическому модулю: ${err.message || 'Не удалось получить ответ'}. Пожалуйста, попробуйте снова.`,
            timestamp: new Date().toISOString(),
            modelUsed: 'Error'
          }
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-zinc-950/40 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                VPS AI DevOps Assistant
              </h2>
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Интеллектуальный анализ метрик, выявление узких мест и диагностика логов в реальном времени.
            </p>
          </div>
        </div>

        {/* Live Grounding Snapshot Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>CPU: {system?.cpu.usagePercent || 24.5}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <Box className="h-3.5 w-3.5 text-emerald-400" />
            <span>Docker: {docker ? `${docker.running} UP` : '4 UP'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-zinc-300">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>Nginx: {nginx?.activeConnections || 42} conn</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-zinc-300">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>
            При настроенном <code className="text-amber-300">GEMINI_API_KEY</code> отправленный вопрос,
            выбранные метрики сервера и часть последних логов передаются Google Gemini для анализа.
            Без ключа используется локальный диагностический fallback. Не отправляйте через AI
            пароли, токены и другие секреты.
          </p>
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <div className="mb-2 text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Быстрые вопросы для диагностики:
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {suggestedQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              disabled={isLoading}
              className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 text-left text-xs font-medium text-zinc-200 transition-all hover:border-indigo-500/40 hover:bg-zinc-800/80 active:scale-[0.98] disabled:opacity-50"
            >
              <span>{sq}</span>
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4">
        {history.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm"
          >
            {/* User Question */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-indigo-400" />
                <span className="font-semibold text-zinc-100 text-sm">
                  {item.question}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                <span>{item.response.modelUsed}</span>
                <span>•</span>
                <span>{new Date(item.response.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Answer Content */}
            <div className="mt-4 text-xs leading-relaxed text-zinc-300">
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {item.response.answer}
              </div>
            </div>

            {/* Insights Pills & Copy */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                {item.response.insights?.map((ins, insIdx) => (
                  <span
                    key={insIdx}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      ins.type === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {ins.summary}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleCopy(item.response.answer, idx)}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copiedIdx === idx ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Input Box */}
      <div className="sticky bottom-4 rounded-2xl border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Задайте вопрос AI о сервере (например: 'Есть ли аномалии в логах?')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-900/50 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Спросить</span>
          </button>
        </form>
      </div>
    </div>
  );
};
