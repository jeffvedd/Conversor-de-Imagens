import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// ⭐ NOVA BIBLIOTECA CORRETA (SDK 53)
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';

const { width } = Dimensions.get('window');

// ⭐ IDs REAIS DO CLIENTE
const BANNER_ID = "ca-app-pub-5461017538385057/2198444034";
const INTERSTITIAL_ID = "ca-app-pub-5461017538385057/3505223638";

// Prepara o Interstitial
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
  requestNonPersonalizedAdsOnly: false,
});

const MediaConverter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    if (permissionResponse?.status !== 'granted') {
      requestPermission();
    }
  }, []);

  // Carrega o Interstitial ao abrir o app
  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log("Interstitial carregado 👍");
    });

    interstitial.load();

    return unsubscribe;
  }, []);

  // MOSTRA O INTERSTITIAL
  const showInterstitial = async () => {
    try {
      if (interstitial.loaded) {
        interstitial.show();
      }
      interstitial.load(); // prepara para próxima
    } catch (e) {
      console.log("Erro ao exibir interstitial:", e);
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          extension: file.name.split('.').pop().toLowerCase(),
        });
        setConvertedFile(null);
        setProgress(0);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo');
    }
  };

  const convertImage = async (format) => {
    if (!selectedFile) return;

    // ⭐ Mostra o interstitial ANTES de converter
    await showInterstitial();

    setIsConverting(true);
    setProgress(10);

    try {
      const formatMap = {
        'JPEG': SaveFormat.JPEG,
        'JPG': SaveFormat.JPEG,
        'PNG': SaveFormat.PNG,
        'WEBP': SaveFormat.WEBP,
      };

      const targetFormat = formatMap[format];
      if (!targetFormat) throw new Error("Formato não suportado");

      setProgress(35);

      const result = await manipulateAsync(
        selectedFile.uri,
        [],
        {
          compress: 0.9,
          format: targetFormat,
          base64: false,
        }
      );

      setProgress(70);

      const extension = format.toLowerCase();
      const newFileName = `converted_${Date.now()}.${extension}`;
      const newFilePath = `${FileSystem.documentDirectory}${newFileName}`;

      await FileSystem.moveAsync({
        from: result.uri,
        to: newFilePath,
      });

      setProgress(100);

      setConvertedFile({
        uri: newFilePath,
        name: newFileName,
        format: format,
        originalName: selectedFile.name,
      });

      Alert.alert('Sucesso', `Imagem convertida para ${format}`);
    } catch (error) {
      Alert.alert('Erro', `Falha na conversão: ${error.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const convertFile = async (format) => {
    if (!selectedFile) {
      Alert.alert('Erro', 'Selecione um arquivo primeiro');
      return;
    }

    if (selectedFile.mimeType?.includes('image')) {
      await convertImage(format);
    } else {
      Alert.alert('Erro', 'Tipo de arquivo não suportado');
    }
  };

  const saveFile = async () => {
    if (!convertedFile) return;

    try {
      const asset = await MediaLibrary.createAssetAsync(convertedFile.uri);
      await MediaLibrary.createAlbumAsync('Conversões', asset, false);
      Alert.alert('Sucesso', 'Arquivo salvo na galeria!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o arquivo');
    }
  };

  const renderFormatButtons = () => (
    <View style={styles.formatGrid}>
      {['JPEG', 'JPG', 'PNG', 'WEBP'].map((format) => (
        <TouchableOpacity
          key={format}
          style={styles.formatButton}
          onPress={() => convertFile(format)}
          disabled={isConverting}
        >
          <MaterialIcons 
            name="image" 
            size={24} 
            color={isConverting ? '#94a3b8' : '#6366f1'} 
          />
          <Text style={styles.formatText}>{format}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        
        <View style={styles.header}>
          <MaterialIcons name="transform" size={32} color="#6366f1" />
          <Text style={styles.title}>Conversor de Imagens</Text>
          <Text style={styles.subtitle}>Converta imagens rapidamente</Text>
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
          <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          <Text style={styles.uploadText}>Selecionar Imagem</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{selectedFile.name}</Text>
          </View>
        )}

        {selectedFile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Converter para:</Text>
            {renderFormatButtons()}
          </View>
        )}

        {isConverting && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.progressText}>Processando imagem...</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        )}

        {convertedFile && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Conversão Concluída!</Text>
            <Text style={styles.resultFileName}>{convertedFile.name}</Text>

            <TouchableOpacity style={styles.saveButton} onPress={saveFile}>
              <MaterialIcons name="save-alt" size={20} color="#fff" />
              <Text style={styles.saveText}>Salvar na Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ⭐ BANNER NOVO */}
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.FULL_BANNER}
      />

    </View>
  );
};

export default MediaConverter;
