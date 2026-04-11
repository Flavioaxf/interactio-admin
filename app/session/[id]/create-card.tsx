import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addCardToSession, setActiveCard } from '../../../src/firebase';
import { buildMultipleChoiceCard } from '../../../src/types';

// ─────────────────────────────────────────────
// Tipos locais e Constantes
// ─────────────────────────────────────────────

interface OptionDraft {
  id:   string;
  text: string;
}

type TimerOption = 30 | 60 | 120 | 0;

const OPTION_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
const TIMER_OPTIONS: { label: string; value: TimerOption }[] = [
  { label: '30s',   value: 30  },
  { label: '1 min', value: 60  },
  { label: '2 min', value: 120 },
  { label: 'Livre', value: 0   },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ─────────────────────────────────────────────
// Sub-componente: Campo de opção individual
// ─────────────────────────────────────────────
interface OptionRowProps {
  option: OptionDraft;
  color: string;
  index: number;
  canRemove: boolean;
  onChangeText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

const OptionRow: React.FC<OptionRowProps> = ({ option, color, index, canRemove, onChangeText, onRemove }) => {
  const label = String.fromCharCode(65 + index);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.optionRow}>
      <View style={[styles.optionBadge, { backgroundColor: color + '25' }]}>
        <Text style={[styles.optionBadgeText, { color }]}>{label}</Text>
      </View>

      <TextInput
        style={[styles.optionInput, isFocused && styles.inputFocused]}
        value={option.text}
        onChangeText={text => onChangeText(option.id, text)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={`Opção ${label}`}
        placeholderTextColor="#5a5872"
        maxLength={120}
      />

      {canRemove && (
        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(option.id)}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────

export default function CreateCardScreen() {
  const { id: sessionId, activeCardId } = useLocalSearchParams<{ id: string; activeCardId?: string }>();
  const router = useRouter();

  // Form state
  const [question, setQuestion] = useState('');
  const [isQuestionFocused, setIsQuestionFocused] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([{ id: generateId(), text: '' }, { id: generateId(), text: '' }]);
  const [timer, setTimer] = useState<TimerOption>(60);
  
  // Novas Configurações
  const [anonymous, setAnonymous] = useState(true);
  const [hideResults, setHideResults] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);
  
  const [publishing, setPublishing] = useState(false);
  const publishScale = useRef(new Animated.Value(1)).current;

  // Handlers de opções
  const handleChangeOption = useCallback((id: string, text: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  }, []);

  const handleAddOption = useCallback(() => {
    if (options.length >= 6) return Alert.alert('Limite', 'Máximo de 6 opções.');
    setOptions(prev => [...prev, { id: generateId(), text: '' }]);
  }, [options.length]);

  const handleRemoveOption = useCallback((id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  }, []);

  // Validação e Publicação
  const handlePublish = useCallback(async () => {
    if (!question.trim()) return Alert.alert('Atenção', 'Digite a pergunta.');
    if (options.some(o => !o.text.trim())) return Alert.alert('Atenção', 'Preencha todas as opções.');

    Animated.sequence([
      Animated.timing(publishScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(publishScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    setPublishing(true);

    try {
      const cardData = buildMultipleChoiceCard({
        order: Date.now(),
        question: question.trim(),
        options: options.map(o => o.text.trim()),
        timer,
        anonymous,
        // Aqui poderíamos enviar hideResults e allowMultiple se adicionados ao type Card no futuro
      });

      const newCardId = await addCardToSession(sessionId, cardData);
      await setActiveCard(sessionId, newCardId, activeCardId ?? null);

      router.replace({
        pathname: '/session/[id]/live-control' as any,
        params: { id: sessionId, activeCardId: newCardId },
      });
    } catch (err) {
      Alert.alert('Erro', 'Falha ao publicar a pergunta.');
    } finally {
      setPublishing(false);
    }
  }, [question, options, timer, anonymous, sessionId, activeCardId, router, publishScale]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Remove o header feio de diretório do Expo Router */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Container centralizado para não esticar no monitor */}
        <View style={styles.webContainer}>
          
          {/* Header Superior */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>← Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nova Interação</Text>
            <View style={{ width: 60 }} /> {/* Espaçador invisível */}
          </View>

          {/* Abas de Tipos de Pergunta */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabTextActive}>📊 Múltipla Escolha</Text>
            </View>
            <View style={styles.tabDisabled}>
              <Text style={styles.tabTextDisabled}>☁️ Nuvem de Palavras <Text style={styles.soonText}>(Em breve)</Text></Text>
            </View>
            <View style={styles.tabDisabled}>
              <Text style={styles.tabTextDisabled}>💬 Q&A <Text style={styles.soonText}>(Em breve)</Text></Text>
            </View>
          </ScrollView>

          {/* ── Pergunta ── */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>O QUE VOCÊ QUER PERGUNTAR?</Text>
            <TextInput
              style={[styles.questionInput, isQuestionFocused && styles.inputFocused]}
              value={question}
              onChangeText={setQuestion}
              onFocus={() => setIsQuestionFocused(true)}
              onBlur={() => setIsQuestionFocused(false)}
              placeholder="Ex: Qual foi a principal causa da revolução?"
              placeholderTextColor="#5a5872"
              multiline
              maxLength={280}
            />
            <Text style={styles.charCount}>{question.length}/280</Text>
          </View>

          {/* ── Opções ── */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>OPÇÕES DE RESPOSTA</Text>
            {options.map((opt, i) => (
              <OptionRow
                key={opt.id} option={opt} color={OPTION_COLORS[i % OPTION_COLORS.length]} index={i}
                canRemove={options.length > 2} onChangeText={handleChangeOption} onRemove={handleRemoveOption}
              />
            ))}
            {options.length < 6 && (
              <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption}>
                <Text style={styles.addOptionText}>+ Adicionar opção (Máx. 6)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Timer ── */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>TEMPO PARA RESPONDER</Text>
            <View style={styles.timerRow}>
              {TIMER_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.value} style={[styles.timerChip, timer === t.value && styles.timerChipActive]}
                  onPress={() => setTimer(t.value)}
                >
                  <Text style={[styles.timerChipText, timer === t.value && styles.timerChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Configurações Avançadas ── */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>CONFIGURAÇÕES DA SESSÃO</Text>
            
            <View style={styles.settingsCard}>
              {/* Toggle 1: Anônimo */}
              <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Respostas anônimas</Text>
                  <Text style={styles.toggleDesc}>Os participantes não serão identificados na tela.</Text>
                </View>
                <TouchableOpacity style={[styles.toggleTrack, anonymous && styles.toggleTrackOn]} onPress={() => setAnonymous(!anonymous)}>
                  <View style={[styles.toggleThumb, anonymous && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              {/* Toggle 2: Ocultar Resultados (Visual Only) */}
              <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Ocultar resultados parciais</Text>
                  <Text style={styles.toggleDesc}>O telão só mostrará o gráfico após o tempo acabar.</Text>
                </View>
                <TouchableOpacity style={[styles.toggleTrack, hideResults && styles.toggleTrackOn]} onPress={() => setHideResults(!hideResults)}>
                  <View style={[styles.toggleThumb, hideResults && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              {/* Toggle 3: Múltiplas Escolhas (Visual Only) */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Permitir múltiplas seleções</Text>
                  <Text style={styles.toggleDesc}>O aluno poderá selecionar mais de uma opção.</Text>
                </View>
                <TouchableOpacity style={[styles.toggleTrack, allowMultiple && styles.toggleTrackOn]} onPress={() => setAllowMultiple(!allowMultiple)}>
                  <View style={[styles.toggleThumb, allowMultiple && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ── Botão Fixo de Publicar (Centralizado no Web) ── */}
      <View style={styles.footerBackground}>
        <View style={styles.footerContainer}>
          <Animated.View style={{ transform: [{ scale: publishScale }], flex: 1 }}>
            <TouchableOpacity style={[styles.publishBtn, publishing && styles.publishBtnDisabled]} onPress={handlePublish} disabled={publishing} activeOpacity={0.85}>
              {publishing ? (
                <ActivityIndicator color="#0f0e17" />
              ) : (
                <Text style={styles.publishBtnText}>⚡ Iniciar Interação Agora</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  
  // Limita a largura em monitores (Web) e centraliza
  webContainer: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 60 },

  // Header superior novo
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: '#e8e6f0', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#e8e6f0', fontSize: 18, fontWeight: '700' },

  // Abas de formatos
  tabsContainer: { flexDirection: 'row', marginBottom: 30 },
  tab: { backgroundColor: 'rgba(167,139,250,0.15)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#a78bfa' },
  tabActive: { backgroundColor: '#a78bfa' },
  tabTextActive: { color: '#0f0e17', fontWeight: 'bold', fontSize: 14 },
  tabDisabled: { backgroundColor: '#1a1927', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tabTextDisabled: { color: '#5a5872', fontWeight: '600', fontSize: 14 },
  soonText: { fontSize: 11, fontWeight: '400', opacity: 0.7 },

  section: { marginBottom: 32 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: '#5a5872', letterSpacing: 1.2, marginBottom: 12 },
  inputFocused: { borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.03)' },

  questionInput: { backgroundColor: '#1a1927', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 18, color: '#e8e6f0', fontSize: 18, minHeight: 120, paddingTop: 18 },
  charCount: { color: '#5a5872', fontSize: 12, textAlign: 'right', marginTop: 8, fontWeight: '500' },

  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  optionBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionBadgeText: { fontSize: 14, fontWeight: '800' },
  optionInput: { flex: 1, backgroundColor: '#1a1927', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, color: '#e8e6f0', fontSize: 15 },
  removeBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(251, 113, 133, 0.08)', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#fb7185', fontSize: 16, fontWeight: 'bold' },
  addOptionBtn: { backgroundColor: 'rgba(167,139,250,0.03)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(167,139,250,0.3)', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  addOptionText: { color: '#a78bfa', fontSize: 15, fontWeight: '700' },

  timerRow: { flexDirection: 'row', gap: 10 },
  timerChip: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#1a1927', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12 },
  timerChipActive: { backgroundColor: 'rgba(167,139,250,0.15)', borderColor: '#a78bfa' },
  timerChipText: { color: '#8b89a0', fontSize: 14, fontWeight: '600' },
  timerChipTextActive: { color: '#a78bfa', fontWeight: '700' },

  settingsCard: { backgroundColor: '#1a1927', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  toggleLabel: { color: '#e8e6f0', fontSize: 16, fontWeight: '600' },
  toggleDesc: { color: '#8b89a0', fontSize: 13, marginTop: 4, paddingRight: 20 },
  toggleTrack: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#2d2b4a', justifyContent: 'center', padding: 3 },
  toggleTrackOn: { backgroundColor: '#a78bfa' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#8b89a0' },
  toggleThumbOn: { backgroundColor: '#0f0e17', alignSelf: 'flex-end' },

  // Rodapé fixo e centralizado
  footerBackground: { backgroundColor: 'rgba(15, 14, 23, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  footerContainer: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, flexDirection: 'row' },
  publishBtn: { backgroundColor: '#a78bfa', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: { color: '#0f0e17', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});