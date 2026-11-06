import React from 'react';
import { X, BookOpen, CheckCircle, Info } from 'lucide-react';

interface StandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandardsModal: React.FC<StandardsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Padrões Científicos para Etiquetas de Herbário
              </h2>
              <p className="text-xs text-slate-500">
                Diretrizes do Index Herbariorum, Darwin Core e Código Internacional de Nomenclatura (ICN)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Dimensões e Papel Arquivístico
            </p>
            <p>
              As etiquetas oficiais de excicata botânica medem por padrão <strong>12 x 10 cm</strong> (12 cm de largura por 10 cm de comprimento/altura, dimensões ideais para acomodar 4 etiquetas por folha A4 em modo paisagem com amplo espaço horizontal para nomes botânicos, notas ecológicas, fenologia e coordenadas), ou formatos correlatos de acervo (10 x 12 cm, 10,5 x 7,5 cm e 14 x 10 cm). Devem ser impressas em papel sulfite alcalino livre de ácido (acid-free, pH neutro $\ge 7.5$) com gramatura de 90 a 120 g/m², afixadas no canto inferior direito da cartolina de herbário (29 x 42 cm, 250–300 g/m²).
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Estrutura Padronizada da Etiqueta
            </h4>
            <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-md font-mono text-[11px] space-y-1.5 border border-slate-300 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-slate-100">1. Cabeçalho: Logo + Nome do Herbário + Sigla do Herbário</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">2. Sigla do Herbário + TOMBO (Registro único do espécime)</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">3. Família (em caixa alta)</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">4. Gênero + (cf se houver, caso contrário pule) espécie + autor</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">5. Informações de localização (País, Estado, Cidade, UC, Loc., Coords, Alt.)</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">6. Habitat & Notas de campo (Fisionomia, hábito, fenologia, obs.)</div>
              <div className="pl-3 text-slate-700 dark:text-slate-300">7. Rodapé: Coletor (Col.), Nº, Data (algarismos romanos) e Determinador (Det.)</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Regras Taxonômicas & Tipográficas
            </h4>

            <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-400">
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Família Botânica:</strong> Sempre grafada em caixa alta (MAIÚSCULAS) com sufixo obrigatório <code>-ACEAE</code> (ex: <i>FABACEAE</i>, <i>BIGNONIACEAE</i>, <i>ASTERACEAE</i>), segundo a classificação filogenética do APG IV.
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Binômio Científico:</strong> Gênero e epíteto específico grafados obrigatoriamente em <em>itálico</em>. Se houver qualificador (<code>CF</code> como <i>cf.</i> ou <i>aff.</i>), ele é posicionado entre o gênero e a espécie; se não houver, pula diretamente para a espécie (ex: <em>Handroanthus chrysotrichus</em>).
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Autores Taxonômicos:</strong> Nunca devem ser grafados em itálico, mantendo-se em tipo redondo romano com abreviações padronizadas pelo IPNI / Brummitt & Powell (ex: <code>(Mart. ex A.DC.) Mattos</code>, <code>L.</code>, <code>Vell.</code>).
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Data de Coleta:</strong> Pelo padrão histórico e botânico internacional, o mês é indicado em <strong>algarismos romanos</strong> (ex: <code>14.VIII.2023</code>) para evitar ambiguidades entre convenções internacionais (dia/mês vs mês/dia).
              </li>
              <li>
                <strong className="text-slate-800 dark:text-slate-200">Coordenadas Geográficas:</strong> Na América do Sul e Brasil, as longitudes pertencem ao hemisfério ocidental (W / OESTE) e devem conter o sinal negativo na notação decimal (ex: <code>-43.5912°</code>).
              </li>
            </ul>
          </div>

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              O sistema <strong>HerbariumLabel Studio</strong> analisa automaticamente todos esses critérios através do modelo de inteligência artificial Gemini 3.8 Flash para garantir a conformidade institucional e científica antes da impressão.
            </p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
