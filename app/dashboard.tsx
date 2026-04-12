import { useRouter, Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue, remove } from 'firebase/database';
import '../src/firebase'; 

const { width: windowWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [creationState, setCreationState] = useState<{ active: boolean, mode: 'live' | 'studio' | null }>({
    active: false,
    mode: null
  });

  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const db = getDatabase();
    const sessionsRef = ref(db, 'sessions');

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sessionsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => {
          const timeA = a.updatedAt || a.createdAt || 0;
          const timeB = b.updatedAt || b.createdAt || 0;
          return timeB - timeA;
        });
        setSessions(sessionsList);
      } else {
        setSessions([]);
      }
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, []);

  const generateSessionId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = letters.charAt(Math.floor(Math.random() * letters.length)) + 
                          letters.charAt(Math.floor(Math.random() * letters.length));
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    return `${randomLetters}-${randomNumbers}`;
  };

  const handleSelectMode = (mode: 'live' | 'studio') => {
    setModalVisible(false);
    setCreationState({ active: true, mode }); 
    
    setTimeout(() => {
      const newSessionId = generateSessionId();
      setCreationState({ active: false, mode: null });
      
      if (mode === 'live') {
        router.push(`/session/${newSessionId}/create-card` as any);
      } else {
        router.push(`/session/${newSessionId}/studio` as any);
      }
    }, 2500);
  };

  const handleLogout = () => {
    setIsLoggingOut(true); 
    setTimeout(() => { router.replace('/' as any); }, 1800); 
  };

  const executeDelete = async (sessionId: string) => {
    try {
      const db = getDatabase();
      await remove(ref(db, `sessions/${sessionId}`));
      showToast('Apresentação excluída com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir apresentação.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      const db = getDatabase();
      await remove(ref(db, `sessions/${sessionToDelete}`));
      showToast('Apresentação excluída com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir apresentação.', 'error');
    } finally {
      setSessionToDelete(null);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Data desconhecida';
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── TOAST DINÂMICO CENTRALIZADO ── */}
      {toast && (
        <View style={styles.toastWrapper} pointerEvents="none">
          <View style={[styles.toastContainer, { borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)' }]}>
            <View style={[styles.toastIconBox, { backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)' }]}>
              <Ionicons name={toast.type === 'error' ? "warning" : "checkmark-circle"} size={20} color={toast.type === 'error' ? "#ef4444" : "#34d399"} />
            </View>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}

      {/* ── MENU LATERAL ── */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>inter<Text style={styles.highlightText}>actio</Text></Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>APRESENTADOR</Text>
          </View>
        </View>

        <View style={styles.navMenu}>
          <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
            <Ionicons name="home" size={20} color="#a78bfa" />
            <Text style={[styles.navText, styles.navTextActive]}>Início</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="layers-outline" size={20} color="#8b89a0" />
            <Text style={styles.navText}>Minhas Sessões</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="settings-outline" size={20} color="#8b89a0" />
            <Text style={styles.navText}>Configurações</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={isLoggingOut || creationState.active}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      {/* ── ÁREA PRINCIPAL ── */}
      <View style={styles.mainArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Bem-vindo de volta,</Text>
            <Text style={styles.pageTitle}>Seu Painel</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.newSessionBtn}
            onPress={() => setModalVisible(true)}
            disabled={isLoggingOut || creationState.active}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#0f0e17" />
            <Text style={styles.newSessionBtnText}>Nova Sessão</Text>
          </TouchableOpacity>
        </View>

        {loadingSessions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#a78bfa" />
            <Text style={styles.loadingText}>Carregando suas apresentações...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIconBox}>
              <Ionicons name="folder-open-outline" size={32} color="#a78bfa" />
            </View>
            <Text style={styles.emptyStateTitle}>Nenhuma sessão recente</Text>
            <Text style={styles.emptyStateDesc}>
              Crie sua primeira sessão interativa para engajar o seu público em tempo real.
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Sessões Recentes</Text>
            <View style={styles.gridContainer}>
              {sessions.map((session) => {
                const isDraft = session.status === 'draft';
                const slideCount = session.interactions ? session.interactions.length : 0;
                
                const idParts = session.id.split('-');
                const hasValidIdFormat = idParts.length === 2;

                return (
                  <View key={session.id} style={styles.sessionCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.statusBadge, isDraft ? styles.statusDraft : styles.statusActive]}>
                        <View style={[styles.statusDot, { backgroundColor: isDraft ? '#8b89a0' : '#34d399' }]} />
                        <Text style={[styles.statusText, { color: isDraft ? '#8b89a0' : '#34d399' }]}>
                          {isDraft ? 'Rascunho' : 'Ao Vivo'}
                        </Text>
                      </View>
                      
                      <View style={styles.headerRightControls}>
                        <Text style={styles.cardDate}>{formatDate(session.updatedAt || session.createdAt)}</Text>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => setSessionToDelete(session.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>
                        {hasValidIdFormat ? (
                          <>
                            <Text style={{ color: '#e8e6f0' }}>{idParts[0]}</Text>
                            <Text style={{ color: '#a78bfa' }}>-{idParts[1]}</Text>
                          </>
                        ) : (
                          <Text style={{ color: '#e8e6f0' }}>{session.id}</Text>
                        )}
                      </Text>
                      <Text style={styles.cardSubtitle}>{slideCount} {slideCount === 1 ? 'slide criado' : 'slides criados'}</Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        style={styles.cardBtnSecondary} 
                        onPress={() => router.push(`/session/${session.id}/studio` as any)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={16} color="#e8e6f0" />
                        <Text style={styles.cardBtnSecondaryText}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.cardBtnPrimary} 
                        onPress={() => router.push(`/session/${session.id}/live-control` as any)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={16} color="#0f0e17" />
                        <Text style={styles.cardBtnPrimaryText}>Apresentar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* ── MODAL CUSTOMIZADO DE EXCLUSÃO ── */}
      {sessionToDelete && (
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconWrapper}>
              <Ionicons name="trash-outline" size={40} color="#ef4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Excluir Apresentação?</Text>
            <Text style={styles.deleteModalDesc}>
              Tem certeza que deseja excluir a sessão <Text style={{color: '#e8e6f0', fontWeight: 'bold'}}>{sessionToDelete}</Text>? Esta ação apagará todos os slides e não pode ser desfeita.
            </Text>
            
            <View style={styles.deleteButtonsRow}>
              <TouchableOpacity 
                style={styles.deleteCancelBtn} 
                onPress={() => setSessionToDelete(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.deleteConfirmBtn} 
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmBtnText}>Sim, Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── MODAIS E OVERLAYS PADRÕES ── */}
      {isModalVisible && !isLoggingOut && !creationState.active && !sessionToDelete && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Como deseja interagir?</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color="#8b89a0" />
              </TouchableOpacity>
            </View>
            <View style={styles.modeCardsContainer}>
              <TouchableOpacity style={styles.modeCard} activeOpacity={0.8} onPress={() => handleSelectMode('live')}>
                <View style={[styles.modeIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                  <Ionicons name="flash" size={32} color="#38bdf8" />
                </View>
                <Text style={styles.modeTitle}>Modo Rápido</Text>
                <Text style={styles.modeDesc}>Ideal para momentos dinâmicos. Crie e lance uma interação instantaneamente durante a sua apresentação.</Text>
                <View style={styles.modeAction}>
                  <Text style={[styles.modeActionText, { color: '#38bdf8' }]}>Comece agora →</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeCard} activeOpacity={0.8} onPress={() => handleSelectMode('studio')}>
                <View style={[styles.modeIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Ionicons name="layers" size={32} color="#a78bfa" />
                </View>
                <Text style={styles.modeTitle}>Modo Estúdio</Text>
                <Text style={styles.modeDesc}>Planejamento completo. Estruture múltiplas interações e organize a sua apresentação com antecedência.</Text>
                <View style={styles.modeAction}>
                  <Text style={[styles.modeActionText, { color: '#a78bfa' }]}>Abrir estúdio →</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {creationState.active && (
        <View style={styles.overlayScreen}>
          <View style={styles.overlayContent}>
            <View style={[styles.overlayIconWrapper, { 
              backgroundColor: creationState.mode === 'live' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(167, 139, 250, 0.1)',
              borderColor: creationState.mode === 'live' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(167, 139, 250, 0.2)'
            }]}>
              <Ionicons name={creationState.mode === 'live' ? 'rocket' : 'color-palette'} size={48} color={creationState.mode === 'live' ? '#38bdf8' : '#a78bfa'} />
            </View>
            <Text style={styles.overlayTitle}>{creationState.mode === 'live' ? 'Preparando velocidade máxima...' : 'Montando o seu estúdio...'}</Text>
            <Text style={styles.overlayMessageText}>{creationState.mode === 'live' ? 'O Interactio traz agilidade instantânea para transformar apresentações estáticas em diálogos dinâmicos.' : 'Crie apresentações de forma livre e artística. Obtenha respostas do seu público em tempo real.'}</Text>
            <ActivityIndicator size="large" color={creationState.mode === 'live' ? '#38bdf8' : '#a78bfa'} style={{ marginTop: 32 }} />
          </View>
        </View>
      )}

      {isLoggingOut && (
        <View style={styles.overlayScreen}>
          <View style={styles.overlayContent}>
            <View style={[styles.overlayIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
            <Text style={styles.overlayTitle}>Até breve!</Text>
            <Text style={styles.overlayMessageText}>Encerrando a sua sessão com segurança...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#0f0e17' },
  sidebar: { width: 280, backgroundColor: '#13121d', padding: 24, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)', justifyContent: 'space-between' },
  logoContainer: { marginBottom: 40 }, logoText: { fontSize: 28, fontWeight: '900', color: '#e8e6f0', letterSpacing: -1 }, highlightText: { color: '#a78bfa' }, roleBadge: { backgroundColor: 'rgba(167, 139, 250, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 }, roleText: { color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  navMenu: { flex: 1, gap: 8 }, navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 }, navItemActive: { backgroundColor: 'rgba(167, 139, 250, 0.1)' }, navText: { color: '#8b89a0', fontSize: 15, fontWeight: '600' }, navTextActive: { color: '#a78bfa', fontWeight: '800' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, opacity: 0.8 }, logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  
  mainArea: { flex: 1, padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 },
  welcomeText: { color: '#8b89a0', fontSize: 16, marginBottom: 4 }, pageTitle: { color: '#e8e6f0', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  newSessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#c4b5fd', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }, newSessionBtnText: { color: '#0f0e17', fontSize: 16, fontWeight: '800' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }, loadingText: { color: '#8b89a0', marginTop: 16, fontSize: 16 },
  emptyStateContainer: { flex: 1, backgroundColor: '#1a1924', borderRadius: 24, justifyContent: 'center', alignItems: 'center', padding: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }, emptyStateIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167, 139, 250, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }, emptyStateTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', marginBottom: 12 }, emptyStateDesc: { color: '#8b89a0', fontSize: 16, textAlign: 'center', maxWidth: 400, lineHeight: 24 },
  
  sectionTitle: { color: '#8b89a0', fontSize: 14, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 24 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingBottom: 40 },
  sessionCard: { width: Platform.OS === 'web' && windowWidth > 1000 ? '31%' : windowWidth > 700 ? '47%' : '100%', minWidth: 300, backgroundColor: 'rgba(26, 25, 36, 0.8)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerRightControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteButton: { padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  statusDraft: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
  statusActive: { backgroundColor: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.2)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardDate: { color: '#5a5872', fontSize: 13, fontWeight: '600' },
  
  cardBody: { marginBottom: 32 },
  cardTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  cardSubtitle: { color: '#8b89a0', fontSize: 15 },
  cardActions: { flexDirection: 'row', gap: 12 },
  cardBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardBtnSecondaryText: { color: '#e8e6f0', fontSize: 14, fontWeight: '700' },
  cardBtnPrimary: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#c4b5fd', borderRadius: 12 },
  cardBtnPrimaryText: { color: '#0f0e17', fontSize: 14, fontWeight: '800' },

  // ── ESTILOS ATUALIZADOS DO TOAST ──
  toastWrapper: { position: 'absolute', top: 40, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
  toastContainer: { backgroundColor: 'rgba(26, 25, 36, 0.95)', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, borderWidth: 1, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)' } as any) }, 
  toastIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, 
  toastText: { color: '#e8e6f0', fontSize: 15, fontWeight: '700' },
  
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 14, 23, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, ...(Platform.OS === 'web' && { backdropFilter: 'blur(8px)' } as any) }, modalContent: { width: '100%', maxWidth: 800, backgroundColor: '#1a1924', borderRadius: 32, padding: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }, modalTitle: { color: '#e8e6f0', fontSize: 28, fontWeight: '900' }, closeModalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }, modeCardsContainer: { flexDirection: Platform.OS === 'web' && windowWidth > 600 ? 'row' : 'column', gap: 24 }, modeCard: { flex: 1, backgroundColor: '#0f0e17', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }, modeIconBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }, modeTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '800', marginBottom: 12 }, modeDesc: { color: '#8b89a0', fontSize: 15, lineHeight: 22, marginBottom: 32, flex: 1 }, modeAction: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 }, modeActionText: { fontSize: 15, fontWeight: '800' },
  overlayScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 14, 23, 0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, ...(Platform.OS === 'web' && { backdropFilter: 'blur(15px)' } as any) }, overlayContent: { alignItems: 'center', maxWidth: 500, paddingHorizontal: 20 }, overlayIconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 1 }, overlayTitle: { color: '#e8e6f0', fontSize: 32, fontWeight: '900', marginBottom: 16, letterSpacing: -0.5, textAlign: 'center' }, overlayMessageText: { color: '#8b89a0', fontSize: 16, fontWeight: '500', textAlign: 'center', lineHeight: 24 },

  deleteModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 14, 23, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 2000, ...(Platform.OS === 'web' && { backdropFilter: 'blur(8px)' } as any) },
  deleteModalContent: { width: '100%', maxWidth: 450, backgroundColor: '#1a1924', borderRadius: 32, padding: 40, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40 },
  deleteIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  deleteModalTitle: { color: '#e8e6f0', fontSize: 24, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  deleteModalDesc: { color: '#8b89a0', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  deleteButtonsRow: { flexDirection: 'row', gap: 16, width: '100%', marginTop: 32 },
  deleteCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  deleteCancelBtnText: { color: '#e8e6f0', fontSize: 15, fontWeight: '700' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  deleteConfirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});