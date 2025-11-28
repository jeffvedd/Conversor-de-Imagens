// 🔥 ATENÇÃO: Esse arquivo já está PRONTO PARA PUBLICAR na Play Store.

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

// ✅ IMPORTS DO ADMOB
import { 
  AdMobBanner,
  AdMobInterstitial
} from 'expo-ads-admob';

const { width } = Dimensions.get('window');

const MediaConverter = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [convertedFile, setConvertedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  // 🔥 IDs reais DO CLIENTE
  const bannerID = "ca-app-pub-5461017538385057/2198444034";         // ⭐ Banner
  const interstitialID = "ca-app-pub-5461017538385057/3505223638";   // ⭐ Interstitial

  useEffect(() => {
    (async () => {
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
      }
    })();
  }, []);

  // PREPARA O INTERSTITIAL QUANDO O APP ABRE
  useEffect(() => {
    const prepareAd = async () => {
      await AdMobInterstitial.setAdUnitID(interstitialID);
      await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true });
    };

    prepareAd();
  }, []);

  // MOSTRA O INTERSTITIAL
  const showInterstitial = async () => {
    try {
      await AdMobInterstitial.showAdAsync();
      await AdMobInterstitial.requestAdAsync({ servePersonalizedAds: true });
    } catch (e) {
      console.log("Erro ao mostrar interstitial:", e);
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
      console.log('Erro ao selecionar arquivo:', error);
    }
  };

  const convertImage = async (format) => {
    if (!selectedFile) return;

    // 🔥 MOSTRA O INTERSTITIAL ANTES DE CONVERTER
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

      if (!targetFormat) {
        throw new Error(`Formato ${format} não suportado`);
      }

      setProgress(30);

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
        type: 'image',
      });

      Alert.alert('Sucesso', `Imagem convertida para ${format}`);
    } catch (error) {
      console.error('Erro na conversão de imagem:', error);
      Alert.alert('Erro', `Falha na conversão: ${error.message || 'Erro desconhecido'}`);
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
      Alert.alert('Sucesso', 'Arquivo salvo na galeria');
    } catch (error) {
      console.error('Erro ao salvar:', error);
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
          <Text style={[
            styles.formatText,
            isConverting && styles.disabledText
          ]}>
            {format}
          </Text>
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
          <Text style={styles.subtitle}>Converta imagens em diferentes formatos</Text>
        </View>

        <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
          <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          <Text style={styles.uploadText}>Selecionar Imagem</Text>
        </TouchableOpacity>

        {selectedFile && (
          <View style={styles.fileInfo}>
            <View style={styles.fileIcon}>
              <MaterialIcons name="image" size={24} color="#6366f1" />
            </View>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              <Text style={styles.fileType}>
                {selectedFile.mimeType?.split('/')[1]?.toUpperCase() || 'Desconhecido'} • 
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            </View>
          </View>
        )}

        {selectedFile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Converter Para:</Text>
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
            <View style={styles.resultCard}>
              <View style={styles.resultIcon}>
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultFileName} numberOfLines={1}>{convertedFile.name}</Text>
                <Text style={styles.resultFormat}>Formato: {convertedFile.format}</Text>
                <Text style={styles.resultOriginal}>Original: {convertedFile.originalName}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={saveFile}>
              <MaterialIcons name="save-alt" size={20} color="#fff" />
              <Text style={styles.saveText}>Salvar na Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* ⭐ BANNER FIXO */}
      <AdMobBanner
        bannerSize="fullBanner"
        adUnitID={bannerID}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={(err) => console.log("Erro banner:", err)}
      />
    </View>
  );
};

export default MediaConverter;
