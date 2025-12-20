import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../../theme";

const CACHED_PHOTO_KEY = "@ai_cached_photo_uri";

interface AIFaceScanScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export default function AIFaceScanScreen({ navigation }: AIFaceScanScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>("front");
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5, // Reduced quality to reduce file size
        base64: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        // Save photo to cache
        try {
          await AsyncStorage.setItem(CACHED_PHOTO_KEY, photo.uri);
        } catch (error) {
          console.error("Error saving photo to cache:", error);
        }
        // Navigate to AI Consultant with the captured photo
        navigation.navigate("AIConsultant", { photoUri: photo.uri });
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.5, // Reduced quality to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        // Save photo to cache
        try {
          await AsyncStorage.setItem(CACHED_PHOTO_KEY, result.assets[0].uri);
        } catch (error) {
          console.error("Error saving photo to cache:", error);
        }
        // Navigate to AI Consultant with the uploaded photo
        navigation.navigate("AIConsultant", { photoUri: result.assets[0].uri });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  // Camera permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.permissionContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.permissionContent}>
            <MaterialIcons name="camera-alt" size={64} color="#FFFFFF" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to analyze your face shape and recommend the best hairstyles.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadOnlyButton}
              onPress={handleUpload}
              activeOpacity={0.8}
            >
              <Text style={styles.uploadOnlyButtonText}>Upload Photo Instead</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />
        <SafeAreaView style={styles.cameraContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <View style={styles.titleBadge}>
              <Text style={styles.titleText}>Align your face</Text>
            </View>
          </View>

          {/* Face Frame */}
          <View style={styles.faceFrameContainer}>
            <View style={styles.faceFrame}>
              {/* Corner Markers */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* Upload Button */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUpload}
                activeOpacity={0.8}
              >
                <MaterialIcons name="file-upload" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Capture Button */}
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                activeOpacity={0.8}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <MaterialIcons name="camera-alt" size={32} color="#000000" />
                )}
              </TouchableOpacity>

              {/* Flip Camera Button */}
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing(facing === "front" ? "back" : "front")}
                activeOpacity={0.8}
              >
                <MaterialIcons name="flip-camera-ios" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Upload Label */}
            <Text style={styles.uploadLabel}>Upload</Text>

            {/* Info Text */}
            <Text style={styles.infoText}>
              AI will analyze your face shape and recommend the best hairstyles.
            </Text>
          </View>
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  cameraContent: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  titleBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  faceFrameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  faceFrame: {
    width: 280,
    height: 360,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: -2,
    left: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 15,
  },
  topRight: {
    top: -2,
    right: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 15,
  },
  bottomLeft: {
    bottom: -2,
    left: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 15,
  },
  bottomRight: {
    bottom: -2,
    right: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 15,
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: theme.spacing.xl,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  uploadButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  uploadLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.lg,
    marginLeft: -120,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 20,
  },
  // Permission screen styles
  permissionContainer: {
    flex: 1,
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: theme.fonts.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: theme.fonts.medium,
  },
  uploadOnlyButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  uploadOnlyButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
});
