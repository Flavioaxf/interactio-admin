// apps/admin/app/session/[id]/create-card.tsx
// Tela mobile de criação de Card de Múltipla Escolha.
// Rota dinâmica via expo-router: /session/BX-4927/create-card

import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { addCardToSession, setActiveCard } from '../../../src/3_firebase';
import { buildMultipleChoiceCard } from '../../../src/types';

// ─────────────────────────────────────────────
// Tipos locais
// ─────────────────────────────────────────────

interface OptionDraft {
  id:   string; // uuid local (não vai ao Firebase)
  text: string;
}

type TimerOption = 30 | 60 | 120 | 0;

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

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
  option:      OptionDraft;
  color:       string;
  index:       number;
  canRemove:   boolean;
  onChangeText: (id: string, text: string) => void;
  onRemove:    (id: string) => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
  option, color, index, canRemove, onChangeText, onRemove,
}) => {
  const label = String.fromCharCode(65 + index); // A, B, C...

  return (
    <View style={styles.optionRow}>
      <View style={[styles.optionBadge, { backgroundColor: color + '33' }]}>
        <Text style={[styles.optionBadgeText, { color }]}>{label}</Text>
      </View>

      <TextInput
        style={styles.optionInput}
        value={option.text}
        onChangeText={text => onChangeText(option.id, text)}
        placeholder={`Opção ${label}`}
        placeholderTextColor="#5a5872"
        maxLength={120}
        returnKeyType="next"
      />

      {canRemove && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onRemove(option.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
  const { id: sessionId, activeCardId } = useLocalSearchParams<{
    id:            string;
    activeCardId?: string;
  }>();
  const router = useRouter();

  // ── Form state ──
  const [question, setQuestion]   = useState('');
  const [options, setOptions]     = useState<OptionDraft[]>([
    { id: generateId(), text: '' },
    { id: generateId(), text: '' },
  ]);
  const [timer, setTimer]         = useState<TimerOption>(60);
  const [anonymous, setAnonymous] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Animação do botão de publish
  const publishScale = useRef(new Animated.Value(1)).current;

  // ── Handlers de opções ──
  const handleChangeOption = useCallback((id: string, text: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  }, []);

  const handleAddOption = useCallback(() => {
    if (options.length >= 5) {
      Alert.alert('Limite atingido', 'Máximo de 5 opções por card.');
      return;
    }
    setOptions(prev => [...prev, { id: generateId(), text: '' }]);
  }, [options.length]);

  const handleRemoveOption = useCallback((id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  }, []);

  // ── Validação ──
  const validate = useCallback((): string | null => {
    if (!question.trim())
      return 'Digite o enunciado da pergunta.';
    if (options.some(o => !o.text.trim()))
      return 'Preencha o texto de todas as opções.';
    if (new Set(options.map(o => o.text.trim().toLowerCase())).size < options.length)
      return 'As opções não podem ser duplicadas.';
    return null;
  }, [question, options]);

  // ── Publicar ──
  const handlePublish = useCallback(async () => {
    const error = validate();
    if (error) {
      Alert.alert('Atenção', error);
      return;
    }

    // Animação de press
    Animated.sequence([
      Animated.timing(publishScale, { toValue: 0.95, duration: 80,  useNativeDriver: true }),
      Animated.timing(publishScale, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();

    setPublishing(true);

    try {
      // 1. Monta o objeto Card tipado
      const cardData = buildMultipleChoiceCard({
        order:     Date.now(),          // order provisório; pode ser reordenado depois
        question:  question.trim(),
        options:   options.map(o => o.text.trim()),
        timer,
        anonymous,
      });

      // 2. Persiste no Firebase e obtém o ID gerado
      const newCardId = await addCardToSession(sessionId, cardData);

      // 3. Ativa o card imediatamente (publica no Telão e Participante)
      await setActiveCard(sessionId, newCardId, activeCardId ?? null);

      // 4. Navega para a tela de controle ao vivo
      router.replace({
        pathname: `/session/${sessionId}/live-control`,
        params:   { activeCardId: newCardId },
      });
    } catch (err) {
      console.error('[CreateCard] Erro ao publicar:', err);
      Alert.alert(
        'Erro ao publicar',
        'Verifique sua conexão e tente novamente.',
        [{ text: 'OK' }],
      );
    } finally {
      setPublishing(false);
    }
  }, [validate, question, options, timer, anonymous, sessionId, activeCardId, router, publishScale]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cabeçalho ── */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>📊  Múltipla Escolha</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Pergunta ── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>PERGUNTA</Text>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="O que você quer perguntar à audiência?"
            placeholderTextColor="#5a5872"
            multiline
            maxLength={280}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{question.length}/280</Text>
        </View>

        {/* ── Opções ── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>OPÇÕES DE RESPOSTA</Text>
          {options.map((opt, i) => (
            <OptionRow
              key={opt.id}
              option={opt}
              color={OPTION_COLORS[i % OPTION_COLORS.length]}
              index={i}
              canRemove={options.length > 2}
              onChangeText={handleChangeOption}
              onRemove={handleRemoveOption}
            />
          ))}
          {options.length < 5 && (
            <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption}>
              <Text style={styles.addOptionText}>+ Adicionar opção</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Timer ── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>TEMPO DE RESPOSTA</Text>
          <View style={styles.timerRow}>
            {TIMER_OPTIONS.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.timerChip, timer === t.value && styles.timerChipActive]}
                onPress={() => setTimer(t.value)}
              >
                <Text style={[styles.timerChipText, timer === t.value && styles.timerChipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Configurações ── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>CONFIGURAÇÕES</Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAnonymous(v => !v)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.toggleLabel}>Respostas anônimas</Text>
              <Text style={styles.toggleDesc}>Participantes não são identificados</Text>
            </View>
            <View style={[styles.toggleTrack, anonymous && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, anonymous && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Preview do payload ── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>PREVIEW DO PAYLOAD (Firebase)</Text>
          <View style={styles.payloadBox}>
            <Text style={styles.payloadText}>
              {JSON.stringify(
                buildMultipleChoiceCard({
                  order:    1,
                  question: question || '…',
                  options:  options.map(o => o.text || '…'),
                  timer,
                  anonymous,
                }),
                null,
                2,
              )}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Botão fixo de publicar ── */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: publishScale }], flex: 1 }}>
          <TouchableOpacity
            style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={publishing}
            activeOpacity={0.85}
          >
            {publishing ? (
              <ActivityIndicator color="#0f0e17" />
            ) : (
              <Text style={styles.publishBtnText}>⚡  Publicar na sessão</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   24,
  },
  badge: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius:    100,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  badgeText: {
    color:      '#a78bfa',
    fontSize:   13,
    fontWeight: '700',
  },
  cancelText: {
    color:    '#8b89a0',
    fontSize: 15,
  },

  // Seções
  section: {
    marginBottom: 28,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    '600',
    color:         '#5a5872',
    letterSpacing: 0.8,
    marginBottom:  10,
  },

  // Pergunta
  questionInput: {
    backgroundColor: '#1a1927',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.07)',
    borderRadius:    12,
    padding:         14,
    color:           '#e8e6f0',
    fontSize:        16,
    lineHeight:      24,
    minHeight:       100,
  },
  charCount: {
    color:     '#5a5872',
    fontSize:  12,
    textAlign: 'right',
    marginTop:  6,
  },

  // Opções
  optionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   10,
    gap:            10,
  },
  optionBadge: {
    width:          32,
    height:         32,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  optionBadgeText: {
    fontSize:   13,
    fontWeight: '700',
  },
  optionInput: {
    flex:            1,
    backgroundColor: '#1a1927',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.07)',
    borderRadius:    10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color:           '#e8e6f0',
    fontSize:        14,
  },
  removeBtn: {
    width:          28,
    height:         28,
    borderRadius:   8,
    borderWidth:    1,
    borderColor:    'rgba(255,255,255,0.1)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color:    '#5a5872',
    fontSize: 14,
  },
  addOptionBtn: {
    borderWidth:  1,
    borderStyle:  'dashed',
    borderColor:  'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems:   'center',
    marginTop:    4,
  },
  addOptionText: {
    color:      '#8b89a0',
    fontSize:   14,
    fontWeight: '500',
  },

  // Timer
  timerRow: {
    flexDirection: 'row',
    gap:           8,
  },
  timerChip: {
    flex:          1,
    paddingVertical: 12,
    alignItems:    'center',
    backgroundColor: '#1a1927',
    borderWidth:   1,
    borderColor:   'rgba(255,255,255,0.07)',
    borderRadius:  10,
  },
  timerChipActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderColor:     '#a78bfa',
  },
  timerChipText: {
    color:      '#8b89a0',
    fontSize:   13,
    fontWeight: '600',
  },
  timerChipTextActive: {
    color: '#a78bfa',
  },

  // Toggle
  toggleRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    backgroundColor: '#1a1927',
    borderWidth:    1,
    borderColor:    'rgba(255,255,255,0.07)',
    borderRadius:   12,
    padding:        16,
  },
  toggleLabel: {
    color:      '#e8e6f0',
    fontSize:   15,
    fontWeight: '500',
  },
  toggleDesc: {
    color:    '#5a5872',
    fontSize: 12,
    marginTop: 2,
  },
  toggleTrack: {
    width:           44,
    height:          26,
    borderRadius:    13,
    backgroundColor: '#2d2b4a',
    justifyContent:  'center',
    padding:         3,
  },
  toggleTrackOn: {
    backgroundColor: '#7c3aed',
  },
  toggleThumb: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: '#5a5872',
  },
  toggleThumbOn: {
    backgroundColor: '#ffffff',
    alignSelf:       'flex-end',
  },

  // Payload preview
  payloadBox: {
    backgroundColor: '#0a0a12',
    borderRadius:    10,
    padding:         14,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.05)',
  },
  payloadText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize:   11,
    color:      '#8b89a0',
    lineHeight: 18,
  },

  // Footer
  footer: {
    padding:         16,
    paddingBottom:   Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#0f0e17',
    borderTopWidth:  1,
    borderTopColor:  'rgba(255,255,255,0.07)',
    flexDirection:   'row',
  },
  publishBtn: {
    backgroundColor: '#a78bfa',
    borderRadius:    12,
    paddingVertical: 16,
    alignItems:      'center',
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color:      '#0f0e17',
    fontSize:   16,
    fontWeight: '700',
  },
});
