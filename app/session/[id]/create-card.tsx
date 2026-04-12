import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
// ── MUDAMOS PARA O IONICONS PARA ÍCONES COM MAIS "PESO" E PERSONALIDADE ──
import { Ionicons } from '@expo/vector-icons'; 
import { getDatabase, ref, push, update } from 'firebase/database';
import '../../../src/firebase'; 

export default function CreateCardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [activeTab, setActiveTab] = useState('multiple_choice');
  const [isSaving, setIsSaving] = useState(false);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const handleStartInteraction = async () => {
    if (question.trim() === '') {
      alert("Por favor, digite uma pergunta.");
      return;
    }
    
    const validOptions = options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert("Preencha pelo menos duas opções de resposta.");
      return;
    }

    setIsSaving(true);
    try {
      const db = getDatabase();
      const newInteractionRef = push(ref(db, `sessions/${id}/interactions`));
      const interactionId = newInteractionRef.key;

      const interactionData = {
        type: activeTab,
        question: question.trim(),
        options: validOptions,
        createdAt: Date.now()
      };

      await update(ref(db, `sessions/${id}`), {
        [`interactions/${interactionId}`]: interactionData,
        currentInteraction: interactionId, 
        status: 'active'
      });

      // 5. Sucesso! Vai para a tela de apresentação...
  router.push({
    pathname: "/session/[id]/live-control",
    params: { id: typeof id === 'string' ? id : id[0] }
  });

    } catch (error) {
      console.error(error);
      alert("Erro ao iniciar interação. Tente novamente.");
      setIsSaving(false); 
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer} 
      style={styles.root}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { padding: isMobile ? 16 : 32 }]}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Interação</Text>
          
          <View style={styles.sessionCodeBadge}>
            <Text style={styles.sessionCodeText}>Sessão: {id}</Text>
          </View>
        </View>

        <View style={[styles.card, { padding: isMobile ? 24 : 40 }]}>
          
          {/* ── TABS REFORMULADAS COM IDENTIDADE VISUAL PRÓPRIA ── */}
          <View style={styles.tabsContainer}>
            
            {/* Tab 1: Múltipla Escolha (Azul) */}
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'multiple_choice' && styles.tabActive]}
              onPress={() => setActiveTab('multiple_choice')}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="bar-chart" size={16} color="#38bdf8" />
              </View>
              <Text style={[styles.tabText, activeTab === 'multiple_choice' && styles.tabTextActive]}>
                Múltipla Escolha
              </Text>
            </TouchableOpacity>

            {/* Tab 2: Nuvem de Palavras (Rosa) */}
            <TouchableOpacity style={styles.tabDisabled} activeOpacity={1}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 114, 182, 0.1)' }]}>
                <Ionicons name="cloud" size={16} color="rgba(244, 114, 182, 0.5)" />
              </View>
              <Text style={styles.tabTextDisabled}>Nuvem de Palavras</Text>
            </TouchableOpacity>

            {/* Tab 3: Q&A (Verde) */}
            <TouchableOpacity style={styles.tabDisabled} activeOpacity={1}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Ionicons name="chatbubbles" size={16} color="rgba(52, 211, 153, 0.5)" />
              </View>
              <Text style={styles.tabTextDisabled}>Perguntas (Q&A)</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.section}>
            <Text style={styles.label}>O QUE VOCÊ QUER PERGUNTAR?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ex: Qual foi a principal causa da revolução?"
              placeholderTextColor="#5a5872"
              multiline
              numberOfLines={4}
              value={question}
              onChangeText={setQuestion}
              maxLength={280}
              editable={!isSaving}
            />
            <Text style={styles.charCount}>{question.length}/280</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>OPÇÕES DE RESPOSTA</Text>
            
            {options.map((opt, index) => (
              <View key={index} style={styles.optionRow}>
                <View style={styles.optionLetterBox}>
                  <Text style={styles.optionLetterText}>{getOptionLetter(index)}</Text>
                </View>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Opção ${getOptionLetter(index)}`}
                  placeholderTextColor="#5a5872"
                  value={opt}
                  onChangeText={(text) => {
                    const newOpts = [...options];
                    newOpts[index] = text;
                    setOptions(newOpts);
                  }}
                  editable={!isSaving}
                />
              </View>
            ))}

            {options.length < 6 && (
              <TouchableOpacity style={styles.addOptionButton} onPress={addOption} disabled={isSaving}>
                <Text style={styles.addOptionText}>+ Adicionar opção (Máx. 6)</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={styles.startButton} 
            activeOpacity={0.8}
            onPress={handleStartInteraction}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#0f0e17" />
            ) : (
              <Text style={styles.startButtonText}>⚡ Iniciar Interação Agora</Text>
            )}
          </TouchableOpacity>

        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' },
  scrollContainer: { alignItems: 'center', paddingVertical: 40 },
  container: { width: '100%', maxWidth: 900 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backButtonText: { color: '#e8e6f0', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  
  sessionCodeBadge: { backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  sessionCodeText: { color: '#a78bfa', fontSize: 14, fontWeight: '700', letterSpacing: 1 },

  card: { backgroundColor: '#1a1924', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 10 },

  tabsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40 },
  
  // ── ESTILOS DAS TABS ATUALIZADOS ──
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)' 
  },
  tabActive: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderColor: 'rgba(167, 139, 250, 0.4)' // Borda roxa sutil quando ativo, não mais o fundo todo roxo
  },
  tabDisabled: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 16, 
    backgroundColor: 'transparent', 
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  // A caixinha colorida atrás do ícone
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabText: { color: '#8b89a0', fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: '#e8e6f0', fontWeight: '800' },
  tabTextDisabled: { color: '#5a5872', fontWeight: '600', fontSize: 15 },
  
  section: { marginBottom: 32 },
  label: { color: '#a78bfa', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  textArea: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderRadius: 12, color: '#e8e6f0', fontSize: 16, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  charCount: { color: '#5a5872', fontSize: 12, marginTop: 8, textAlign: 'right' },
  
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  optionLetterBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.1)', alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { color: '#a78bfa', fontWeight: '800', fontSize: 16 },
  optionInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderRadius: 12, color: '#e8e6f0', fontSize: 16, padding: 12 },
  
  addOptionButton: { paddingVertical: 12, marginTop: 12, borderWidth: 2, borderColor: 'rgba(167,139,250,0.3)', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center' },
  addOptionText: { color: '#a78bfa', fontWeight: '700', fontSize: 14 },
  
    startButton: { backgroundColor: 'rgba(167,139,250,0.9)', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
    startButtonText: { color: '#0f0e17', fontWeight: '800', fontSize: 16 }
  });