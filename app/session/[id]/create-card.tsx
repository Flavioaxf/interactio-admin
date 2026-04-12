import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, update } from 'firebase/database';
import '../../../src/firebase'; 

export default function CreateCardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const sessionId = typeof id === 'string' ? id : id?.[0];
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [activeTab, setActiveTab] = useState('multiple_choice');
  // NOVO ESTADO: Controle de limite de palavras
  const [wordLimit, setWordLimit] = useState<number | 'unlimited'>(3);
  const [isSaving, setIsSaving] = useState(false);

  const addOption = () => { if (options.length < 6) setOptions([...options, '']); };
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const handleStartInteraction = async () => {
    if (question.trim() === '') return alert("Por favor, digite uma pergunta.");
    
    setIsSaving(true);
    try {
      const db = getDatabase();
      const interactionData = {
        type: activeTab,
        question: question.trim(),
        options: activeTab === 'multiple_choice' ? options.filter(opt => opt.trim() !== '') : [],
        // SALVA O LIMITE NO BANCO DE DADOS
        limit: activeTab === 'word_cloud' ? wordLimit : 1, 
        createdAt: Date.now()
      };

      await update(ref(db, `sessions/${sessionId}`), {
        interactions: [interactionData], 
        currentInteraction: 0,
        status: 'active'
      });

      router.push({ pathname: "/session/[id]/live-control", params: { id: sessionId } } as any);
    } catch (error) {
      alert("Erro ao iniciar.");
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bgGlow, { top: -150, left: -100, backgroundColor: 'rgba(167, 139, 250, 0.15)' }]} />
      <View style={[styles.bgGlow, { bottom: -150, right: -100, backgroundColor: 'rgba(56, 189, 248, 0.08)' }]} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color="#e8e6f0" />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Modo Rápido</Text>
            <View style={styles.sessionCodeBadge}>
              <Text style={styles.sessionCodeLabel}>Sessão:</Text>
              <Text style={styles.sessionCodeText}>{sessionId}</Text>
            </View>
          </View>

          <View style={styles.card}>
            
            <View style={styles.tabsContainer}>
              <TouchableOpacity style={[styles.tab, activeTab === 'multiple_choice' && styles.tabActive]} onPress={() => setActiveTab('multiple_choice')} activeOpacity={0.7}>
                <View style={[styles.iconBox, { backgroundColor: activeTab === 'multiple_choice' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                  <Ionicons name="bar-chart" size={16} color={activeTab === 'multiple_choice' ? '#38bdf8' : '#8b89a0'} />
                </View>
                <Text style={[styles.tabText, activeTab === 'multiple_choice' && styles.tabTextActive]}>Múltipla Escolha</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.tab, activeTab === 'word_cloud' && styles.tabActive]} onPress={() => setActiveTab('word_cloud')} activeOpacity={0.7}>
                <View style={[styles.iconBox, { backgroundColor: activeTab === 'word_cloud' ? 'rgba(244, 114, 182, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                  <Ionicons name="cloud" size={16} color={activeTab === 'word_cloud' ? '#f472b6' : '#8b89a0'} />
                </View>
                <Text style={[styles.tabText, activeTab === 'word_cloud' && styles.tabTextActive]}>Nuvem de Palavras</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.tab, activeTab === 'q_and_a' && styles.tabActive]} onPress={() => setActiveTab('q_and_a')} activeOpacity={0.7}>
                <View style={[styles.iconBox, { backgroundColor: activeTab === 'q_and_a' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.05)' }]}>
                  <Ionicons name="chatbubbles" size={16} color={activeTab === 'q_and_a' ? '#34d399' : '#8b89a0'} />
                </View>
                <Text style={[styles.tabText, activeTab === 'q_and_a' && styles.tabTextActive]}>Q&A</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>O QUE VOCÊ QUER PERGUNTAR?</Text>
              <TextInput style={styles.textArea} placeholder="Ex: Qual o maior desafio do nosso setor hoje?" placeholderTextColor="#5a5872" multiline value={question} onChangeText={setQuestion} />
            </View>

            {activeTab === 'multiple_choice' && (
              <View style={styles.section}>
                <Text style={styles.label}>OPÇÕES DE RESPOSTA</Text>
                {options.map((opt, index) => (
                  <View key={index} style={styles.optionRow}>
                    <View style={styles.optionLetterBox}>
                      <Text style={styles.optionLetterText}>{getOptionLetter(index)}</Text>
                    </View>
                    <TextInput style={styles.optionInput} placeholder={`Opção ${getOptionLetter(index)}`} placeholderTextColor="#5a5872" value={opt} onChangeText={(text) => { const newOpts = [...options]; newOpts[index] = text; setOptions(newOpts); }} />
                  </View>
                ))}
                {options.length < 6 && (
                  <TouchableOpacity style={styles.addOptionButton} onPress={addOption} activeOpacity={0.6}>
                    <Ionicons name="add" size={18} color="#a78bfa" />
                    <Text style={styles.addOptionText}>Adicionar opção (Máx. 6)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── NOVA SEÇÃO: CONFIGURAÇÃO DA NUVEM ── */}
            {activeTab === 'word_cloud' && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: '#f472b6' }]}>RESPOSTAS POR PARTICIPANTE</Text>
                <View style={styles.limitRow}>
                  {[1, 3, 5, 'unlimited'].map((limitValue) => (
                    <TouchableOpacity 
                      key={limitValue.toString()}
                      style={[styles.limitButton, wordLimit === limitValue && styles.limitButtonActive]}
                      onPress={() => setWordLimit(limitValue as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.limitButtonText, wordLimit === limitValue && styles.limitButtonTextActive]}>
                        {limitValue === 'unlimited' ? 'Ilimitado' : limitValue}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTab !== 'multiple_choice' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color={activeTab === 'word_cloud' ? '#f472b6' : '#34d399'} />
                <Text style={styles.infoText}>
                  {activeTab === 'word_cloud' 
                    ? "Neste formato, o público envia palavras curtas. Termos repetidos ganharão destaque automático no telão."
                    : "Neste formato, o público envia perguntas abertas e pode votar nas melhores dúvidas dos colegas."}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.startButton} onPress={handleStartInteraction} disabled={isSaving} activeOpacity={0.8}>
              {isSaving ? <ActivityIndicator color="#0f0e17" /> : (
                <View style={styles.startButtonInner}>
                  <Ionicons name="play" size={20} color="#0f0e17" />
                  <Text style={styles.startButtonText}>Iniciar Interação</Text>
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0e17' }, bgGlow: { position: 'absolute', width: 500, height: 500, borderRadius: 250, filter: 'blur(120px)' as any, opacity: 0.8 }, scrollContainer: { alignItems: 'center', paddingVertical: 40, flexGrow: 1, justifyContent: 'center' }, container: { width: '100%', maxWidth: 850, paddingHorizontal: 24 }, 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }, backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }, backButtonText: { color: '#e8e6f0', fontSize: 14, fontWeight: '600' }, headerTitle: { color: '#e8e6f0', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 }, sessionCodeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' }, sessionCodeLabel: { color: '#8b89a0', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }, sessionCodeText: { color: '#a78bfa', fontSize: 16, fontWeight: '800', letterSpacing: 1 }, 
  card: { backgroundColor: 'rgba(26, 25, 36, 0.8)', borderRadius: 32, padding: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30, backdropFilter: 'blur(20px)' as any }, 
  tabsContainer: { flexDirection: 'row', gap: 12, marginBottom: 40, flexWrap: 'wrap' }, tab: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }, tabActive: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(167, 139, 250, 0.3)' }, iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }, tabText: { color: '#8b89a0', fontWeight: '600', fontSize: 15 }, tabTextActive: { color: '#e8e6f0', fontWeight: '800' }, 
  section: { marginBottom: 32 }, label: { color: '#a78bfa', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 }, textArea: { backgroundColor: '#0f0e17', color: '#e8e6f0', fontSize: 18, borderRadius: 16, padding: 24, minHeight: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', textAlignVertical: 'top', ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) }, 
  optionRow: { flexDirection: 'row', marginBottom: 12 }, optionLetterBox: { backgroundColor: 'rgba(167, 139, 250, 0.1)', width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.15)' }, optionLetterText: { color: '#a78bfa', fontSize: 18, fontWeight: '800' }, optionInput: { flex: 1, backgroundColor: '#0f0e17', color: '#e8e6f0', height: 56, borderRadius: 16, paddingHorizontal: 20, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any) }, addOptionButton: { flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', borderStyle: 'dashed', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 }, addOptionText: { color: '#a78bfa', fontWeight: '700', fontSize: 15 }, 
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 }, infoText: { flex: 1, color: '#8b89a0', fontSize: 15, lineHeight: 24 },
  startButton: { backgroundColor: '#a78bfa', paddingVertical: 20, borderRadius: 16, shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, marginTop: 10 }, startButtonInner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, startButtonText: { color: '#0f0e17', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  
  // ── ESTILOS DOS BOTÕES DE LIMITE DA NUVEM ──
  limitRow: { flexDirection: 'row', gap: 12 },
  limitButton: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center' },
  limitButtonActive: { borderColor: 'rgba(244, 114, 182, 0.4)', backgroundColor: 'rgba(244, 114, 182, 0.1)' },
  limitButtonText: { color: '#8b89a0', fontWeight: '700', fontSize: 15 },
  limitButtonTextActive: { color: '#f472b6', fontWeight: '900' }
});