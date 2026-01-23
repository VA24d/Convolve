import "react-native-gesture-handler";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BACKEND_URL } from "./config";
import { runMobileOrchestration } from "./orchestration";

type AnalyzeResponse = {
  signals: {
    housing_type: string;
    assets: string[];
    demographics: string[];
    state?: string | null;
    caste?: string | null;
    land_acres?: number | null;
    intent?: string | null;
    notes?: string | null;
  };
  explanations: Array<Record<string, unknown>>;
  memories: Array<Record<string, unknown>>;
  memory_id?: string;
};

type ImageState = {
  uri: string;
  base64?: string | null;
} | null;

type HousingOption = "kutcha" | "pucca" | "unknown";

type GenderOption = "female" | "male" | "other" | "prefer_not";

type ApplicantProfile = {
  fullName: string;
  age: string;
  gender: GenderOption;
  phone: string;
  address: string;
  district: string;
  income: string;
  householdSize: string;
  idNumber: string;
  bankAccount: string;
};

type HistoryEntry = {
  id: string;
  createdAt: string;
  intent: string | null;
  result: AnalyzeResponse;
};

type SchemeOption = {
  name: string;
  benefits: string | null;
  score: number | null;
  schemeId: string | null;
  pointId: string | null;
};

type MemoryStatus = "draft" | "submitted" | "approved" | "rejected";

type UpdateStatus = {
  message: string;
  isError: boolean;
};

type SchemeFormData = {
  schemeName: string;
  applicantName: string;
  age: string;
  gender: GenderOption;
  phone: string;
  address: string;
  district: string;
  state: string;
  caste: string;
  landAcres: string;
  housingType: string;
  income: string;
  householdSize: string;
  assets: string;
  demographics: string;
  intent: string;
  bankAccount: string;
  idNumber: string;
  consent: boolean;
};

type RootStackParamList = {
  Home: undefined;
  Results: { entry: HistoryEntry };
  History: undefined;
  SchemeForm: { entry: HistoryEntry; schemeName: string };
  Settings: undefined;
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home"> & {
  state: string;
  caste: string;
  landAcres: string;
  housingType: HousingOption;
  assets: string;
  demographics: string;
  intent: string;
  image: ImageState;
  useVision: boolean;
  loading: boolean;
  error: string | null;
  applicantProfile: ApplicantProfile;
  setState: (value: string) => void;
  setCaste: (value: string) => void;
  setLandAcres: (value: string) => void;
  setHousingType: (value: HousingOption) => void;
  setAssets: (value: string) => void;
  setDemographics: (value: string) => void;
  setIntent: (value: string) => void;
  setUseVision: (value: boolean) => void;
  setApplicantProfile: (value: ApplicantProfile) => void;
  onPickImage: () => Promise<void>;
  onTakePhoto: () => Promise<void>;
  onAnalyze: (navigation: HomeScreenProps["navigation"]) => Promise<void>;
  onOpenMock: (navigation: HomeScreenProps["navigation"]) => void;
};

type ResultsScreenProps = NativeStackScreenProps<RootStackParamList, "Results"> & {
  autoSpeak: boolean;
  onSpeak: (explanations: Array<Record<string, unknown>>) => void;
  onStopSpeak: () => void;
};

type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, "History"> & {
  history: HistoryEntry[];
};

type SchemeFormScreenProps = NativeStackScreenProps<RootStackParamList, "SchemeForm"> & {
  applicantProfile: ApplicantProfile;
  setApplicantProfile: (value: ApplicantProfile) => void;
};

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, "Settings"> & {
  useVision: boolean;
  setUseVision: (value: boolean) => void;
  autoSpeak: boolean;
  setAutoSpeak: (value: boolean) => void;
  useBackend: boolean;
  setUseBackend: (value: boolean) => void;
  backendAvailable: boolean;
};

const HOUSING_OPTIONS: HousingOption[] = ["kutcha", "pucca", "unknown"];
const GENDER_OPTIONS: GenderOption[] = ["female", "male", "other", "prefer_not"];
const Stack = createNativeStackNavigator<RootStackParamList>();

const MOCK_RESPONSE: AnalyzeResponse = {
  signals: {
    housing_type: "pucca",
    assets: ["solar panel", "bicycle"],
    demographics: ["widow", "senior"],
    state: "Rajasthan",
    caste: "SC",
    land_acres: 1.5,
    intent: "housing support for rural families",
    notes: "Mock response for offline demo.",
  },
  explanations: [
    {
      scheme_name: "PM Awas Yojana",
      benefits: "Subsidy for rural housing construction",
      score: 0.86,
      scheme_id: "PMAY-R",
      point_id: "mock-point-1",
    },
    {
      scheme_name: "National Social Assistance",
      benefits: "Monthly pension for senior citizens",
      score: 0.71,
      scheme_id: "NSAP",
      point_id: "mock-point-2",
    },
  ],
  memories: [
    {
      summary: "Mock memory: widow senior seeking housing support",
      created_at: new Date().toISOString(),
    },
  ],
  memory_id: "mock-memory-001",
};

enableScreens();

function buildImagePickerOptions(): ImagePicker.ImagePickerOptions {
  const options: ImagePicker.ImagePickerOptions = {
    base64: true,
    quality: 0.7,
  };

  if (ImagePicker.MediaType?.Images) {
    options.mediaTypes = [ImagePicker.MediaType.Images];
  }

  return options;
}

function normalizeText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function formatHousingLabel(option: HousingOption): string {
  switch (option) {
    case "kutcha":
      return "Kutcha";
    case "pucca":
      return "Pucca";
    default:
      return "Not sure";
  }
}

function formatGenderLabel(option: GenderOption): string {
  switch (option) {
    case "female":
      return "Female";
    case "male":
      return "Male";
    case "other":
      return "Other";
    default:
      return "Prefer not to say";
  }
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getSchemeOptions(explanations: Array<Record<string, unknown>>): SchemeOption[] {
  return explanations.map(function buildOption(explanation, index) {
    const schemeName = getStringValue(explanation.scheme_name) ?? `Scheme ${index + 1}`;
    const benefits = getStringValue(explanation.benefits);
    const score = typeof explanation.score === "number" ? explanation.score : null;
    const schemeId = getStringValue(explanation.scheme_id);
    const pointId = getStringValue(explanation.point_id);
    return {
      name: schemeName,
      benefits,
      score,
      schemeId,
      pointId,
    };
  });
}

function formatScore(score: number | null): string {
  if (score === null) {
    return "Score unavailable";
  }
  return `Score ${score.toFixed(2)}`;
}

function formatHousingType(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value === "unknown" ? "Not sure" : value;
}

function formatNumberValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function formatListValue(value: string[]): string {
  return value.length > 0 ? value.join(", ") : "";
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const truthyValues = ["true", "1", "yes", "y"];
    if (truthyValues.indexOf(normalized) >= 0) {
      return true;
    }
    const falsyValues = ["false", "0", "no", "n", ""];
    if (falsyValues.indexOf(normalized) >= 0) {
      return false;
    }
    return normalized.length > 0;
  }
  return Boolean(value);
}

function logBooleanWarning(label: string, value: unknown): void {
  if (typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    console.warn(`[App] ${label} expected boolean but received string: ${value}`);
    return;
  }
  console.warn(`[App] ${label} expected boolean but received ${typeof value}`);
}

function isBackendConfigured(): boolean {
  return Boolean(BACKEND_URL && !BACKEND_URL.startsWith("YOUR_"));
}

function getBackendUrl(): string {
  if (!isBackendConfigured()) {
    throw new Error("Set BACKEND_URL in mobile/config.ts to use the backend API.");
  }
  return BACKEND_URL.replace(/\/$/, "");
}

function buildFormData(
  entry: HistoryEntry,
  applicantProfile: ApplicantProfile,
  schemeName: string
): SchemeFormData {
  const { signals } = entry.result;
  return {
    schemeName,
    applicantName: applicantProfile.fullName,
    age: applicantProfile.age,
    gender: applicantProfile.gender,
    phone: applicantProfile.phone,
    address: applicantProfile.address,
    district: applicantProfile.district,
    state: signals.state ?? "",
    caste: signals.caste ?? "",
    landAcres: formatNumberValue(signals.land_acres),
    housingType: formatHousingType(signals.housing_type),
    income: applicantProfile.income,
    householdSize: applicantProfile.householdSize,
    assets: formatListValue(signals.assets),
    demographics: formatListValue(signals.demographics),
    intent: signals.intent ?? entry.intent ?? "",
    bankAccount: applicantProfile.bankAccount,
    idNumber: applicantProfile.idNumber,
    consent: false,
  };
}

function updateApplicantProfile(
  current: ApplicantProfile,
  form: SchemeFormData
): ApplicantProfile {
  return {
    ...current,
    fullName: form.applicantName,
    age: form.age,
    gender: form.gender,
    phone: form.phone,
    address: form.address,
    district: form.district,
    income: form.income,
    householdSize: form.householdSize,
    idNumber: form.idNumber,
    bankAccount: form.bankAccount,
  };
}

function buildRequirementChecklist(signals: AnalyzeResponse["signals"]): string[] {
  const requirements = ["Government-issued ID proof", "Recent photograph", "Address proof"];
  if (signals.caste) {
    requirements.push("Caste certificate (if applicable)");
  }
  if (signals.land_acres !== null && signals.land_acres !== undefined) {
    requirements.push("Landholding records / khasra details");
  }
  if (signals.housing_type !== "unknown") {
    requirements.push("Housing condition proof (photo or survey record)");
  }
  return requirements;
}

function validateFormData(data: SchemeFormData): string[] {
  const errors: string[] = [];
  if (!data.schemeName.trim()) {
    errors.push("Select a scheme to proceed.");
  }
  if (!data.applicantName.trim()) {
    errors.push("Applicant name is required.");
  }
  if (!data.phone.trim()) {
    errors.push("Phone number is required.");
  }
  if (!data.consent) {
    errors.push("Consent must be provided to share this form.");
  }
  return errors;
}

function buildShareText(data: SchemeFormData, requirements: string[]): string {
  const lines = [
    `Scheme Application Draft: ${data.schemeName}`,
    "",
    "Applicant Details",
    `Name: ${data.applicantName || "-"}`,
    `Age: ${data.age || "-"}`,
    `Gender: ${formatGenderLabel(data.gender)}`,
    `Phone: ${data.phone || "-"}`,
    `Address: ${data.address || "-"}`,
    `District: ${data.district || "-"}`,
    `State: ${data.state || "-"}`,
    "",
    "Eligibility Signals",
    `Caste: ${data.caste || "-"}`,
    `Land (acres): ${data.landAcres || "-"}`,
    `Housing Type: ${data.housingType || "-"}`,
    `Assets: ${data.assets || "-"}`,
    `Demographics: ${data.demographics || "-"}`,
    `Intent: ${data.intent || "-"}`,
    "",
    "Financial",
    `Income: ${data.income || "-"}`,
    `Household Size: ${data.householdSize || "-"}`,
    `Bank Account: ${data.bankAccount || "-"}`,
    `ID Number: ${data.idNumber || "-"}`,
    "",
    "Required Documents",
    ...requirements.map((item) => `- ${item}`),
    "",
    "Generated by Yojana-Drishti Mobile",
  ];

  return lines.join("\n");
}

function buildExplanationSpeech(explanations: Array<Record<string, unknown>>): string {
  if (explanations.length === 0) {
    return "No explanations are available.";
  }

  return explanations
    .map(function buildLine(explanation, index) {
      const schemeName = getStringValue(explanation.scheme_name) ?? `Scheme ${index + 1}`;
      const benefits = getStringValue(explanation.benefits);
      const score =
        typeof explanation.score === "number" ? `Score ${explanation.score.toFixed(2)}` : null;
      return [schemeName, benefits, score].filter(Boolean).join(". ");
    })
    .join(". ");
}

function buildMemoryUpdatePayload(
  status: MemoryStatus,
  feedbackScore: string,
  selectedSchemeId: string,
  notes: string
): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {};

  const feedback = feedbackScore.trim();
  if (feedback.length > 0) {
    const parsed = Number.parseFloat(feedback);
    if (!Number.isNaN(parsed)) {
      payload.feedback_score = Math.min(Math.max(parsed, 0), 1);
    }
  }

  if (selectedSchemeId.trim()) {
    payload.chosen_scheme_id = selectedSchemeId.trim();
  }

  if (notes.trim()) {
    payload.notes = notes.trim();
  }

  if (status !== "draft") {
    payload.status = status;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildEvidencePack(
  entry: HistoryEntry,
  schemeOptions: SchemeOption[],
  selectedSchemeId: string
): string {
  const selectedScheme = schemeOptions.find((option) => option.schemeId === selectedSchemeId);
  const lines = [
    "Evidence Pack: Yojana-Drishti",
    "",
    `Memory ID: ${entry.result.memory_id ?? "-"}`,
    "",
    "Signals",
    formatJson(entry.result.signals),
    "",
    "Top Schemes",
    ...schemeOptions.map((option) => {
      return `- ${option.name} | scheme_id=${option.schemeId ?? "-"} | point_id=${
        option.pointId ?? "-"
      }`;
    }),
    "",
    "Selected Scheme",
    selectedScheme
      ? `${selectedScheme.name} (scheme_id=${selectedScheme.schemeId ?? "-"})`
      : selectedSchemeId || "-",
    "",
    "Qdrant Point IDs",
    ...schemeOptions.map((option) => option.pointId ?? "-"),
    "",
    "Generated by Yojana-Drishti Mobile",
  ];

  return lines.join("\n");
}

async function updateMemory(
  caseId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const response = await fetch(`${getBackendUrl()}/memory/${caseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Unable to update memory.");
  }

  return "Memory updated.";
}

function HomeScreen(props: HomeScreenProps): JSX.Element {
  const applicant = props.applicantProfile;

  function updateApplicantField<Key extends keyof ApplicantProfile>(
    key: Key,
    value: ApplicantProfile[Key]
  ): void {
    props.setApplicantProfile({ ...applicant, [key]: value });
  }

  function handleVisionToggle(value: boolean): void {
    props.setUseVision(normalizeBoolean(value));
  }

  const useVisionValue = normalizeBoolean(props.useVision);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          onLongPress={function onMockPress(): void {
            props.onOpenMock(props.navigation);
          }}
          delayLongPress={800}
        >
          <Text style={styles.title}>Yojana-Drishti Mobile</Text>
          <Text style={styles.caption}>
            Mobile client for on-device LangChain orchestration with Qdrant.
          </Text>
        </Pressable>
        <View style={styles.navRow}>
          <Pressable
            style={styles.navButton}
            onPress={function onHistoryPress(): void {
              props.navigation.navigate("History");
            }}
          >
            <Text style={styles.navButtonText}>History</Text>
          </Pressable>
          <Pressable
            style={styles.navButton}
            onPress={function onSettingsPress(): void {
              props.navigation.navigate("Settings");
            }}
          >
            <Text style={styles.navButtonText}>Settings</Text>
          </Pressable>
        </View>
        {props.error ? <Text style={styles.error}>{props.error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Applicant details</Text>
          <Text style={styles.helper}>
            Capture basic identity details for the scheme form. This stays on-device until you
            share.
          </Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={applicant.fullName}
            onChangeText={function onChange(value): void {
              updateApplicantField("fullName", value);
            }}
            placeholder="e.g., Sunita Devi"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={applicant.age}
            onChangeText={function onChange(value): void {
              updateApplicantField("age", value);
            }}
            placeholder="e.g., 42"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map(function renderOption(option) {
              const selected = option === applicant.gender;
              return (
                <Pressable
                  key={option}
                  onPress={function onOptionPress(): void {
                    updateApplicantField("gender", option);
                  }}
                  style={[styles.optionButton, selected ? styles.optionButtonActive : null]}
                >
                  <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>
                    {formatGenderLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={applicant.phone}
            onChangeText={function onChange(value): void {
              updateApplicantField("phone", value);
            }}
            placeholder="e.g., 9876543210"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={applicant.address}
            onChangeText={function onChange(value): void {
              updateApplicantField("address", value);
            }}
            placeholder="Village / Street / Landmark"
            autoCapitalize="words"
          />

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            value={applicant.district}
            onChangeText={function onChange(value): void {
              updateApplicantField("district", value);
            }}
            placeholder="e.g., Udaipur"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Annual Income</Text>
          <TextInput
            style={styles.input}
            value={applicant.income}
            onChangeText={function onChange(value): void {
              updateApplicantField("income", value);
            }}
            placeholder="e.g., 120000"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Household Size</Text>
          <TextInput
            style={styles.input}
            value={applicant.householdSize}
            onChangeText={function onChange(value): void {
              updateApplicantField("householdSize", value);
            }}
            placeholder="e.g., 4"
            keyboardType="numeric"
          />

          <Text style={styles.label}>ID Number (last 4 digits)</Text>
          <TextInput
            style={styles.input}
            value={applicant.idNumber}
            onChangeText={function onChange(value): void {
              updateApplicantField("idNumber", value);
            }}
            placeholder="e.g., 1234"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Bank Account (last 4 digits)</Text>
          <TextInput
            style={styles.input}
            value={applicant.bankAccount}
            onChangeText={function onChange(value): void {
              updateApplicantField("bankAccount", value);
            }}
            placeholder="e.g., 5678"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Eligibility details</Text>
          <Text style={styles.helper}>
            Tip: If Vision is enabled, you can leave fields blank and we will infer missing
            details from the photo.
          </Text>

          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={props.state}
            onChangeText={props.setState}
            placeholder="e.g., Rajasthan"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Caste</Text>
          <TextInput
            style={styles.input}
            value={props.caste}
            onChangeText={props.setCaste}
            placeholder="e.g., SC"
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Land (acres)</Text>
          <TextInput
            style={styles.input}
            value={props.landAcres}
            keyboardType="numeric"
            onChangeText={props.setLandAcres}
            placeholder="e.g., 2"
          />

          <Text style={styles.label}>Housing Type</Text>
          <View style={styles.optionRow}>
            {HOUSING_OPTIONS.map(function renderOption(option) {
              const selected = option === props.housingType;
              return (
                <Pressable
                  key={option}
                  onPress={function onOptionPress(): void {
                    props.setHousingType(option);
                  }}
                  style={[styles.optionButton, selected ? styles.optionButtonActive : null]}
                >
                  <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>
                    {formatHousingLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Assets (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={props.assets}
            onChangeText={props.setAssets}
            placeholder="e.g., cattle, tractor"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Demographics (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={props.demographics}
            onChangeText={props.setDemographics}
            placeholder="e.g., elderly female"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Intent</Text>
          <TextInput
            style={styles.input}
            value={props.intent}
            onChangeText={props.setIntent}
            placeholder="e.g., housing support for rural families"
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Photo evidence</Text>
          <Text style={styles.helper}>
            Add a photo to help Vision auto-detect housing condition, assets, and other
            signals.
          </Text>

          <View style={styles.buttonRow}>
            <View style={[styles.buttonItem, styles.buttonItemSpacer]}>
              <Button title="Select Photo" onPress={props.onPickImage} />
            </View>
            <View style={styles.buttonItem}>
              <Button title="Take Photo" onPress={props.onTakePhoto} />
            </View>
          </View>
          {props.image?.uri ? (
            <Image source={{ uri: props.image.uri }} style={styles.preview} />
          ) : (
            <Text style={styles.helper}>No photo selected yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Use Vision (OpenAI)</Text>
              <Text style={styles.helper}>Enable to infer missing details from the photo.</Text>
            </View>
            <Switch value={useVisionValue} onValueChange={handleVisionToggle} />
          </View>
          <Button
            title={props.loading ? "Analyzing..." : "Analyze"}
            onPress={function onAnalyzePress(): void {
              void props.onAnalyze(props.navigation);
            }}
            disabled={props.loading}
          />
          {props.loading ? <ActivityIndicator style={styles.loading} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultsScreen(props: ResultsScreenProps): JSX.Element {
  const { entry } = props.route.params;
  const schemeOptions = useMemo(
    function buildOptions() {
      return getSchemeOptions(entry.result.explanations);
    },
    [entry.result.explanations]
  );
  const [status, setStatus] = useState<MemoryStatus>("draft");
  const [feedbackScore, setFeedbackScore] = useState("");
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [notes, setNotes] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  useEffect(
    function handleAutoSpeak() {
      if (!props.autoSpeak) {
        return undefined;
      }

      props.onSpeak(entry.result.explanations);
      return function cleanup(): void {
        props.onStopSpeak();
      };
    },
    [entry, props]
  );

  useEffect(
    function syncDefaultScheme() {
      if (selectedSchemeId || schemeOptions.length === 0) {
        return;
      }
      const firstSchemeId = schemeOptions[0].schemeId ?? "";
      setSelectedSchemeId(firstSchemeId);
    },
    [schemeOptions, selectedSchemeId]
  );

  async function handleMemoryUpdate(): Promise<void> {
    if (!entry.result.memory_id) {
      setUpdateStatus({
        message: "memory_id not available. Ensure backend mode is enabled.",
        isError: true,
      });
      return;
    }

    const payload = buildMemoryUpdatePayload(status, feedbackScore, selectedSchemeId, notes);
    if (!payload) {
      setUpdateStatus({
        message: "Add a status, feedback score, scheme, or notes before updating.",
        isError: true,
      });
      return;
    }

    try {
      const message = await updateMemory(entry.result.memory_id, payload);
      setUpdateStatus({ message, isError: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update memory.";
      setUpdateStatus({ message, isError: true });
    }
  }

  async function handleShareEvidence(): Promise<void> {
    const message = buildEvidencePack(entry, schemeOptions, selectedSchemeId);
    await Share.share({ message });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Results</Text>
        <Text style={styles.helper}>Analyzed {formatTimestamp(entry.createdAt)}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recommended schemes</Text>
          {schemeOptions.length === 0 ? (
            <Text style={styles.helper}>No scheme matches found yet.</Text>
          ) : (
            schemeOptions.map(function renderOption(option) {
              return (
                <View key={option.name} style={styles.schemeCard}>
                  <Text style={styles.schemeTitle}>{option.name}</Text>
                  {option.benefits ? <Text style={styles.helper}>{option.benefits}</Text> : null}
                  <Text style={styles.schemeMeta}>{formatScore(option.score)}</Text>
                  {option.pointId ? (
                    <Text style={styles.schemeMeta}>Qdrant point: {option.pointId}</Text>
                  ) : null}
                  {option.schemeId ? (
                    <Text style={styles.schemeMeta}>Scheme ID: {option.schemeId}</Text>
                  ) : null}
                  <View style={styles.buttonRow}>
                    <View style={styles.buttonItem}>
                      <Button
                        title="Fill Scheme Form"
                        onPress={function onFillFormPress(): void {
                          props.navigation.navigate("SchemeForm", {
                            entry,
                            schemeName: option.name,
                          });
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Case Memory</Text>
          <Text style={styles.helper}>Memory ID: {entry.result.memory_id ?? "-"}</Text>
          {updateStatus ? (
            <Text style={updateStatus.isError ? styles.error : styles.success}>
              {updateStatus.message}
            </Text>
          ) : null}

          <Text style={styles.label}>Status</Text>
          <View style={styles.optionRow}>
            {(["draft", "submitted", "approved", "rejected"] as MemoryStatus[]).map(
              function renderStatus(option) {
                const selected = option === status;
                return (
                  <Pressable
                    key={option}
                    onPress={function onOptionPress(): void {
                      setStatus(option);
                    }}
                    style={[styles.optionButton, selected ? styles.optionButtonActive : null]}
                  >
                    <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          <Text style={styles.label}>Feedback score (0 to 1)</Text>
          <TextInput
            style={styles.input}
            value={feedbackScore}
            onChangeText={setFeedbackScore}
            placeholder="0.0 to 1.0"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Select chosen scheme (scheme_id)</Text>
          <TextInput
            style={styles.input}
            value={selectedSchemeId}
            onChangeText={setSelectedSchemeId}
            placeholder="scheme_id"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add field notes for the case"
          />

          <View style={styles.buttonRow}>
            <View style={[styles.buttonItem, styles.buttonItemSpacer]}>
              <Button title="Update Memory" onPress={handleMemoryUpdate} />
            </View>
            <View style={styles.buttonItem}>
              <Button title="Share Evidence Pack" onPress={handleShareEvidence} />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Signals</Text>
          <Text style={styles.code}>{formatJson(entry.result.signals)}</Text>

          <Text style={styles.sectionTitle}>Explanations</Text>
          <Text style={styles.code}>{formatJson(entry.result.explanations)}</Text>

          <Text style={styles.sectionTitle}>Memory</Text>
          <Text style={styles.code}>{formatJson(entry.result.memories)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Text to Speech</Text>
          <Text style={styles.helper}>Reads the scheme explanations aloud.</Text>
          <View style={styles.buttonRow}>
            <View style={[styles.buttonItem, styles.buttonItemSpacer]}>
              <Button
                title="Read Explanations"
                onPress={function onSpeakPress(): void {
                  props.onSpeak(entry.result.explanations);
                }}
              />
            </View>
            <View style={styles.buttonItem}>
              <Button title="Stop" onPress={props.onStopSpeak} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryScreen(props: HistoryScreenProps): JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>History</Text>
        {props.history.length === 0 ? (
          <Text style={styles.helper}>No past runs yet.</Text>
        ) : (
          props.history.map(function renderEntry(entry) {
            return (
              <Pressable
                key={entry.id}
                style={styles.historyCard}
                onPress={function onEntryPress(): void {
                  props.navigation.navigate("Results", { entry });
                }}
              >
                <Text style={styles.historyTitle}>
                  {entry.intent ?? "Eligibility summary"}
                </Text>
                <Text style={styles.helper}>{formatTimestamp(entry.createdAt)}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SchemeFormScreen(props: SchemeFormScreenProps): JSX.Element {
  const { entry, schemeName } = props.route.params;
  const [formData, setFormData] = useState(function initForm() {
    return buildFormData(entry, props.applicantProfile, schemeName);
  });
  const [error, setError] = useState<string | null>(null);
  const requirements = useMemo(
    function buildRequirements() {
      return buildRequirementChecklist(entry.result.signals);
    },
    [entry.result.signals]
  );

  function updateFormField<Key extends keyof SchemeFormData>(
    key: Key,
    value: SchemeFormData[Key]
  ): void {
    setFormData(function applyUpdate(current) {
      return { ...current, [key]: value };
    });
  }

  async function handleShare(): Promise<void> {
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }

    setError(null);
    props.setApplicantProfile(updateApplicantProfile(props.applicantProfile, formData));

    const message = buildShareText(formData, requirements);
    await Share.share({ message });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Scheme Form Draft</Text>
        <Text style={styles.helper}>
          Prefilled with eligibility signals. Review, edit, and share with officials.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Scheme</Text>
          <TextInput
            style={styles.input}
            value={formData.schemeName}
            onChangeText={function onChange(value): void {
              updateFormField("schemeName", value);
            }}
            placeholder="Scheme name"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Applicant Details</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={formData.applicantName}
            onChangeText={function onChange(value): void {
              updateFormField("applicantName", value);
            }}
            placeholder="Applicant name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={formData.age}
            onChangeText={function onChange(value): void {
              updateFormField("age", value);
            }}
            keyboardType="numeric"
            placeholder="Age"
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map(function renderOption(option) {
              const selected = option === formData.gender;
              return (
                <Pressable
                  key={option}
                  onPress={function onOptionPress(): void {
                    updateFormField("gender", option);
                  }}
                  style={[styles.optionButton, selected ? styles.optionButtonActive : null]}
                >
                  <Text style={[styles.optionText, selected ? styles.optionTextActive : null]}>
                    {formatGenderLabel(option)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={function onChange(value): void {
              updateFormField("phone", value);
            }}
            keyboardType="phone-pad"
            placeholder="Phone number"
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={function onChange(value): void {
              updateFormField("address", value);
            }}
            placeholder="Address"
          />

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            value={formData.district}
            onChangeText={function onChange(value): void {
              updateFormField("district", value);
            }}
            placeholder="District"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Eligibility Signals</Text>

          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={formData.state}
            onChangeText={function onChange(value): void {
              updateFormField("state", value);
            }}
            placeholder="State"
          />

          <Text style={styles.label}>Caste</Text>
          <TextInput
            style={styles.input}
            value={formData.caste}
            onChangeText={function onChange(value): void {
              updateFormField("caste", value);
            }}
            placeholder="Caste"
          />

          <Text style={styles.label}>Land (acres)</Text>
          <TextInput
            style={styles.input}
            value={formData.landAcres}
            onChangeText={function onChange(value): void {
              updateFormField("landAcres", value);
            }}
            keyboardType="numeric"
            placeholder="Land in acres"
          />

          <Text style={styles.label}>Housing Type</Text>
          <TextInput
            style={styles.input}
            value={formData.housingType}
            onChangeText={function onChange(value): void {
              updateFormField("housingType", value);
            }}
            placeholder="Kutcha / Pucca"
          />

          <Text style={styles.label}>Assets</Text>
          <TextInput
            style={styles.input}
            value={formData.assets}
            onChangeText={function onChange(value): void {
              updateFormField("assets", value);
            }}
            placeholder="Assets"
          />

          <Text style={styles.label}>Demographics</Text>
          <TextInput
            style={styles.input}
            value={formData.demographics}
            onChangeText={function onChange(value): void {
              updateFormField("demographics", value);
            }}
            placeholder="Demographics"
          />

          <Text style={styles.label}>Intent</Text>
          <TextInput
            style={styles.input}
            value={formData.intent}
            onChangeText={function onChange(value): void {
              updateFormField("intent", value);
            }}
            placeholder="Intent"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Financial Details</Text>

          <Text style={styles.label}>Annual Income</Text>
          <TextInput
            style={styles.input}
            value={formData.income}
            onChangeText={function onChange(value): void {
              updateFormField("income", value);
            }}
            keyboardType="numeric"
            placeholder="Income"
          />

          <Text style={styles.label}>Household Size</Text>
          <TextInput
            style={styles.input}
            value={formData.householdSize}
            onChangeText={function onChange(value): void {
              updateFormField("householdSize", value);
            }}
            keyboardType="numeric"
            placeholder="Household size"
          />

          <Text style={styles.label}>Bank Account (last 4 digits)</Text>
          <TextInput
            style={styles.input}
            value={formData.bankAccount}
            onChangeText={function onChange(value): void {
              updateFormField("bankAccount", value);
            }}
            keyboardType="numeric"
            placeholder="Bank account"
          />

          <Text style={styles.label}>ID Number (last 4 digits)</Text>
          <TextInput
            style={styles.input}
            value={formData.idNumber}
            onChangeText={function onChange(value): void {
              updateFormField("idNumber", value);
            }}
            keyboardType="numeric"
            placeholder="ID number"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          {requirements.map(function renderRequirement(item) {
            return (
              <Text key={item} style={styles.requirementItem}>
                {"\u2022 "}
                {item}
              </Text>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Applicant consent</Text>
              <Text style={styles.helper}>
                Confirm the applicant agrees to share their details.
              </Text>
            </View>
            <Switch
              value={Boolean(formData.consent)}
              onValueChange={function onToggle(value): void {
                updateFormField("consent", value);
              }}
            />
          </View>
          <Button title="Share Form Draft" onPress={handleShare} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsScreen(props: SettingsScreenProps): JSX.Element {
  function handleVisionToggle(value: boolean): void {
    props.setUseVision(normalizeBoolean(value));
  }

  function handleAutoSpeakToggle(value: boolean): void {
    props.setAutoSpeak(normalizeBoolean(value));
  }

  function handleBackendToggle(value: boolean): void {
    props.setUseBackend(normalizeBoolean(value));
  }

  const useVisionValue = normalizeBoolean(props.useVision);
  const autoSpeakValue = normalizeBoolean(props.autoSpeak);
  const backendEnabled = props.backendAvailable;
  const useBackendValue = backendEnabled && normalizeBoolean(props.useBackend);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Use Vision by default</Text>
              <Text style={styles.helper}>Enable photo inference whenever available.</Text>
            </View>
            <Switch value={useVisionValue} onValueChange={handleVisionToggle} />
          </View>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Auto read explanations</Text>
              <Text style={styles.helper}>Speak results automatically on the Results page.</Text>
            </View>
            <Switch value={autoSpeakValue} onValueChange={handleAutoSpeakToggle} />
          </View>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Use backend mode</Text>
              <Text style={styles.helper}>
                Use the FastAPI backend for hybrid retrieval + memory IDs.
              </Text>
            </View>
            <Switch
              value={useBackendValue}
              onValueChange={handleBackendToggle}
              disabled={!backendEnabled}
            />
          </View>
          {backendEnabled ? null : (
            <Text style={styles.helper}>
              Backend mode is unavailable until BACKEND_URL is configured.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App(): JSX.Element {
  const [state, setState] = useState("");
  const [caste, setCaste] = useState("");
  const [landAcres, setLandAcres] = useState("");
  const [housingType, setHousingType] = useState<HousingOption>("unknown");
  const [assets, setAssets] = useState("");
  const [demographics, setDemographics] = useState("");
  const [intent, setIntent] = useState("");
  const [image, setImage] = useState<ImageState>(null);
  const [useVision, setUseVision] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [useBackend, setUseBackend] = useState<boolean>(function initBackendState() {
    return isBackendConfigured();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfile>({
    fullName: "",
    age: "",
    gender: "prefer_not",
    phone: "",
    address: "",
    district: "",
    income: "",
    householdSize: "",
    idNumber: "",
    bankAccount: "",
  });

  const landValue = useMemo(function computeLandValue() {
    if (!landAcres.trim()) {
      return null;
    }
    const parsed = Number.parseFloat(landAcres);
    return Number.isNaN(parsed) ? null : parsed;
  }, [landAcres]);

  function setPickedImage(result: ImagePicker.ImagePickerResult): void {
    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset) {
      setError("No photo data returned from the picker.");
      return;
    }

    setImage({ uri: asset.uri, base64: asset.base64 });
  }

  async function requestMediaLibraryPermission(): Promise<boolean> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required.");
      return false;
    }
    return true;
  }

  async function requestCameraPermission(): Promise<boolean> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required.");
      return false;
    }
    return true;
  }

  async function pickImageFromLibrary(): Promise<void> {
    setError(null);
    if (!(await requestMediaLibraryPermission())) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync(buildImagePickerOptions());

      if (result.canceled || !result.assets?.length) {
        setError("No photo selected.");
        return;
      }

      setPickedImage(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to open photo library.";
      setError(message);
    }
  }

  async function takePhoto(): Promise<void> {
    setError(null);
    if (!(await requestCameraPermission())) {
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync(buildImagePickerOptions());

      if (result.canceled || !result.assets?.length) {
        setError("Photo capture was canceled.");
        return;
      }

      setPickedImage(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to open camera.";
      setError(message);
    }
  }

  async function analyze(
    navigation: NativeStackScreenProps<RootStackParamList, "Home">["navigation"]
  ): Promise<void> {
    setError(null);
    setLoading(true);

    try {
      const normalizedState = normalizeText(state);
      const normalizedCaste = normalizeText(caste);
      const normalizedIntent = normalizeText(intent);

      const data = await runMobileOrchestration({
        state: normalizedState,
        caste: normalizedCaste,
        landAcres: landValue,
        housingType,
        assets: parseList(assets),
        demographics: parseList(demographics),
        intent: normalizedIntent,
        useVision: useVisionValue,
        imageBase64: image?.base64 ?? null,
        useBackend: useBackendValue,
      });

      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        intent: normalizedIntent,
        result: data,
      };

      setHistory(function addEntry(current) {
        return [entry, ...current];
      });

      navigation.navigate("Results", { entry });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function openMockResponse(
    navigation: NativeStackScreenProps<RootStackParamList, "Home">["navigation"]
  ): void {
    const entry: HistoryEntry = {
      id: `mock-${Date.now()}`,
      createdAt: new Date().toISOString(),
      intent: MOCK_RESPONSE.signals.intent ?? "Mock eligibility summary",
      result: MOCK_RESPONSE,
    };

    setHistory(function addEntry(current) {
      return [entry, ...current];
    });

    navigation.navigate("Results", { entry });
  }

  function speakExplanations(explanations: Array<Record<string, unknown>>): void {
    const text = buildExplanationSpeech(explanations);
    Speech.stop();
    Speech.speak(text);
  }

  function stopSpeech(): void {
    Speech.stop();
  }

  function handleUseVisionChange(value: boolean): void {
    setUseVision(normalizeBoolean(value));
  }

  function handleAutoSpeakChange(value: boolean): void {
    setAutoSpeak(normalizeBoolean(value));
  }

  function handleUseBackendChange(value: boolean): void {
    setUseBackend(normalizeBoolean(value));
  }

  useEffect(
    function syncBooleanState() {
      if (typeof useVision !== "boolean") {
        setUseVision(normalizeBoolean(useVision));
      }
      if (typeof autoSpeak !== "boolean") {
        setAutoSpeak(normalizeBoolean(autoSpeak));
      }
      if (typeof useBackend !== "boolean") {
        setUseBackend(normalizeBoolean(useBackend));
      }
    },
    [useVision, autoSpeak, useBackend]
  );

  const backendAvailable = isBackendConfigured();
  const useVisionValue = normalizeBoolean(useVision);
  const autoSpeakValue = normalizeBoolean(autoSpeak);
  const useBackendValue = backendAvailable && normalizeBoolean(useBackend);

  if (!backendAvailable) {
    console.warn("[App] BACKEND_URL is not configured; using on-device orchestration.");
  }

  logBooleanWarning("useVision", useVision);
  logBooleanWarning("autoSpeak", autoSpeak);
  logBooleanWarning("useBackend", useBackend);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" options={{ headerShown: false }}>
            {function renderHomeScreen(props) {
              return (
                <HomeScreen
                  {...props}
                  state={state}
                  caste={caste}
                  landAcres={landAcres}
                  housingType={housingType}
                  assets={assets}
                  demographics={demographics}
                  intent={intent}
                  image={image}
                  useVision={useVisionValue}
                  loading={loading}
                  error={error}
                  applicantProfile={applicantProfile}
                  setState={setState}
                  setCaste={setCaste}
                  setLandAcres={setLandAcres}
                  setHousingType={setHousingType}
                  setAssets={setAssets}
                  setDemographics={setDemographics}
                  setIntent={setIntent}
                  setUseVision={handleUseVisionChange}
                  setApplicantProfile={setApplicantProfile}
                  onPickImage={pickImageFromLibrary}
                  onTakePhoto={takePhoto}
                  onAnalyze={analyze}
                  onOpenMock={openMockResponse}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen name="Results" options={{ title: "Results" }}>
            {function renderResultsScreen(props) {
              return (
                <ResultsScreen
                  {...props}
                  autoSpeak={autoSpeakValue}
                  onSpeak={speakExplanations}
                  onStopSpeak={stopSpeech}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen name="SchemeForm" options={{ title: "Scheme Form" }}>
            {function renderSchemeFormScreen(props) {
              return (
                <SchemeFormScreen
                  {...props}
                  applicantProfile={applicantProfile}
                  setApplicantProfile={setApplicantProfile}
                />
              );
            }}
          </Stack.Screen>
          <Stack.Screen name="History" options={{ title: "History" }}>
            {function renderHistoryScreen(props) {
              return <HistoryScreen {...props} history={history} />;
            }}
          </Stack.Screen>
          <Stack.Screen name="Settings" options={{ title: "Settings" }}>
            {function renderSettingsScreen(props) {
              return (
                <SettingsScreen
                  {...props}
                  useVision={useVisionValue}
                  setUseVision={handleUseVisionChange}
                  autoSpeak={autoSpeakValue}
                  setAutoSpeak={handleAutoSpeakChange}
                  useBackend={useBackendValue}
                  setUseBackend={handleUseBackendChange}
                  backendAvailable={backendAvailable}
                />
              );
            }}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f8fb",
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 6,
  },
  caption: {
    color: "#555",
    marginBottom: 16,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d7d7e3",
    marginLeft: 8,
    backgroundColor: "#fff",
  },
  navButtonText: {
    fontSize: 13,
    color: "#1f6feb",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e7e7ef",
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e7ef",
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  schemeCard: {
    borderWidth: 1,
    borderColor: "#e1e1ec",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fdfdff",
  },
  schemeTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },
  schemeMeta: {
    fontSize: 12,
    color: "#667",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  helper: {
    fontSize: 12,
    color: "#667",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },
  preview: {
    width: "100%",
    height: 220,
    marginTop: 12,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: "row",
  },
  buttonItem: {
    flex: 1,
  },
  buttonItemSpacer: {
    marginRight: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#d7d7e3",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f4f4f8",
  },
  optionButtonActive: {
    backgroundColor: "#1f6feb",
    borderColor: "#1f6feb",
  },
  optionText: {
    color: "#445",
    fontSize: 13,
    fontWeight: "500",
  },
  optionTextActive: {
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  loading: {
    marginTop: 16,
  },
  error: {
    color: "#c00",
    marginTop: 6,
    marginBottom: 12,
  },
  code: {
    fontFamily: "Menlo",
    fontSize: 12,
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 6,
  },
  success: {
    color: "#0a7a35",
    marginTop: 6,
    marginBottom: 12,
  },
  requirementItem: {
    fontSize: 13,
    color: "#445",
    marginBottom: 6,
  },
});