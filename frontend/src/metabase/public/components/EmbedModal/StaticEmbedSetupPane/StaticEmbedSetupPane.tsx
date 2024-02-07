import { t } from "ttag";
import _ from "underscore";
import { useMemo, useState } from "react";
import { Stack, Tabs } from "metabase/ui";
import { useSelector } from "metabase/lib/redux";
import { getSetting } from "metabase/selectors/settings";
import { checkNotNull } from "metabase/lib/types";
import type {
  EmbeddingDisplayOptions,
  EmbeddingParametersOptions,
  EmbeddingParametersSettings,
  EmbeddingParametersValues,
  EmbedResource,
  EmbedResourceParameter,
  EmbedResourceType,
} from "metabase/public/lib/types";
import {
  getSignedPreviewUrlWithoutHash,
  optionsToHashParams,
} from "metabase/public/lib/embed";
import { getEmbedServerCodeExampleOptions } from "metabase/public/lib/code";

import {
  trackStaticEmbedCodeCopied,
  trackStaticEmbedDiscarded,
  trackStaticEmbedPublished,
  trackStaticEmbedUnpublished,
} from "metabase/public/lib/analytics";
import { getCanWhitelabel } from "metabase/selectors/whitelabel";
import { getDefaultDisplayOptions } from "./config";
import { ServerEmbedCodePane } from "./ServerEmbedCodePane";
import { EmbedModalContentStatusBar } from "./EmbedModalContentStatusBar";
import { ParametersSettings } from "./ParametersSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { OverviewSettings } from "./OverviewSettings";
import type { ActivePreviewPane, EmbedCodePaneVariant } from "./types";
import { EMBED_MODAL_TABS } from "./tabs";
import { SettingsTabLayout } from "./StaticEmbedSetupPane.styled";
import { PreviewModeSelector } from "./PreviewModeSelector";
import { PreviewPane } from "./PreviewPane";

const countEmbeddingParameterOptions = (
  embeddingParams: EmbeddingParametersSettings,
) =>
  Object.values(embeddingParams).reduce(
    (acc, value) => {
      acc[value] += 1;
      return acc;
    },
    { disabled: 0, locked: 0, enabled: 0 } as Record<
      EmbeddingParametersOptions,
      number
    >,
  );

export interface StaticEmbedSetupPaneProps {
  resource: EmbedResource;
  resourceType: EmbedResourceType;
  resourceParameters: EmbedResourceParameter[];

  onUpdateEnableEmbedding: (enableEmbedding: boolean) => void | Promise<void>;
  onUpdateEmbeddingParams: (
    embeddingParams: EmbeddingParametersSettings,
  ) => void | Promise<void>;
}

export const StaticEmbedSetupPane = ({
  resource,
  resourceType,
  resourceParameters,
  onUpdateEnableEmbedding,
  onUpdateEmbeddingParams,
}: StaticEmbedSetupPaneProps): JSX.Element => {
  const [activePane, setActivePane] = useState<ActivePreviewPane>("code");

  const siteUrl = useSelector(state => getSetting(state, "site-url"));
  const secretKey = checkNotNull(
    useSelector(state => getSetting(state, "embedding-secret-key")),
  );
  const initialEmbeddingParams = getDefaultEmbeddingParams(
    resource,
    resourceParameters,
  );
  const [embeddingParams, setEmbeddingParams] =
    useState<EmbeddingParametersSettings>(initialEmbeddingParams);
  const [parameterValues, setParameterValues] =
    useState<EmbeddingParametersValues>({});

  const canWhitelabel = useSelector(getCanWhitelabel);
  const shouldShowDownloadData = canWhitelabel && resourceType === "question";
  const [displayOptions, setDisplayOptions] = useState<EmbeddingDisplayOptions>(
    getDefaultDisplayOptions(shouldShowDownloadData),
  );

  const previewParametersBySlug = useMemo(
    () =>
      getPreviewParamsBySlug({
        resourceParameters,
        embeddingParams,
        parameterValues,
      }),
    [embeddingParams, parameterValues, resourceParameters],
  );
  const initialPreviewParameters = getPreviewParamsBySlug({
    resourceParameters,
    embeddingParams: initialEmbeddingParams,
    parameterValues: {},
  });
  const lockedParameters = getLockedPreviewParameters(
    resourceParameters,
    embeddingParams,
  );

  const serverCodeOptions = getEmbedServerCodeExampleOptions({
    siteUrl,
    secretKey,
    resourceType,
    resourceId: resource.id,
    params: previewParametersBySlug,
    displayOptions,
  });

  const [selectedServerCodeOptionId, setSelectedServerCodeOptionId] = useState(
    serverCodeOptions[0].id,
  );

  const selectedServerCodeOption = serverCodeOptions.find(
    ({ id }) => id === selectedServerCodeOptionId,
  );

  const hasSettingsChanges = getHasSettingsChanges({
    initialEmbeddingParams,
    embeddingParams,
  });

  const iframeUrlWithoutHash = useMemo(
    () =>
      getSignedPreviewUrlWithoutHash(
        siteUrl,
        resourceType,
        resource.id,
        previewParametersBySlug,
        secretKey,
        embeddingParams,
      ),
    [
      embeddingParams,
      previewParametersBySlug,
      resource.id,
      resourceType,
      secretKey,
      siteUrl,
    ],
  );

  const iframeUrl = iframeUrlWithoutHash + optionsToHashParams(displayOptions);

  const handleSave = async () => {
    if (!resource.enable_embedding) {
      await onUpdateEnableEmbedding(true);
    }
    await onUpdateEmbeddingParams(embeddingParams);
    trackStaticEmbedPublished({
      artifact: resourceType,
      resource,
      params: countEmbeddingParameterOptions({
        ...convertResourceParametersToEmbeddingParams(resourceParameters),
        ...embeddingParams,
      }),
    });
  };

  const handleUnpublish = async () => {
    await onUpdateEnableEmbedding(false);
    trackStaticEmbedUnpublished({
      artifact: resourceType,
      resource,
    });
  };

  const handleDiscard = () => {
    setEmbeddingParams(getDefaultEmbeddingParams(resource, resourceParameters));
    trackStaticEmbedDiscarded({
      artifact: resourceType,
    });
  };

  const getServerEmbedCodePane = (variant: EmbedCodePaneVariant) => {
    return (
      <ServerEmbedCodePane
        className="flex-full w-full"
        variant={variant}
        initialPreviewParameters={initialPreviewParameters}
        resource={resource}
        resourceType={resourceType}
        siteUrl={siteUrl}
        secretKey={secretKey}
        params={previewParametersBySlug}
        displayOptions={displayOptions}
        serverCodeOptions={serverCodeOptions}
        selectedServerCodeOptionId={selectedServerCodeOptionId}
        setSelectedServerCodeOptionId={setSelectedServerCodeOptionId}
        onCopy={() =>
          handleCodeCopy({
            code: "backend",
            variant,
            language: selectedServerCodeOptionId,
          })
        }
      />
    );
  };

  const handleCodeCopy = ({
    code,
    variant,
    language,
  }: {
    code: "backend" | "view";
    variant: EmbedCodePaneVariant;
    language: string;
  }) => {
    const locationMap = {
      overview: "code_overview",
      parameters: "code_params",
      appearance: "code_appearance",
    } as const;
    trackStaticEmbedCodeCopied({
      artifact: resourceType,
      location: locationMap[variant],
      code,
      language,
      displayOptions,
    });
  };

  const [activeTab, setActiveTab] = useState<
    typeof EMBED_MODAL_TABS[keyof typeof EMBED_MODAL_TABS]
  >(EMBED_MODAL_TABS.Overview);
  return (
    <Stack spacing={0}>
      <EmbedModalContentStatusBar
        resourceType={resourceType}
        isPublished={resource.enable_embedding}
        hasSettingsChanges={hasSettingsChanges}
        onSave={handleSave}
        onUnpublish={handleUnpublish}
        onDiscard={handleDiscard}
      />

      <Tabs
        defaultValue={EMBED_MODAL_TABS.Overview}
        data-testid="embedding-preview"
      >
        <Tabs.List p="0 1.5rem">
          <Tabs.Tab
            value={EMBED_MODAL_TABS.Overview}
            onClick={() => setActiveTab(EMBED_MODAL_TABS.Overview)}
          >{t`Overview`}</Tabs.Tab>
          <Tabs.Tab
            value={EMBED_MODAL_TABS.Parameters}
            onClick={() => setActiveTab(EMBED_MODAL_TABS.Parameters)}
          >{t`Parameters`}</Tabs.Tab>
          <Tabs.Tab
            value={EMBED_MODAL_TABS.Appearance}
            onClick={() => setActiveTab(EMBED_MODAL_TABS.Appearance)}
          >{t`Appearance`}</Tabs.Tab>
        </Tabs.List>
        {/**
         * Please do not add more than one `Tabs.Panel` here.
         *
         * The reason there is only one `Tabs.Panel` is because I don't want
         * the iframe (rendered inside `PreviewPane`) to be re-mounted when
         * changing tabs. Otherwise, the preview will be reloaded
         * every time we change tabs which makes it hard for users to see
         * the preview while editing settings.
         *
         * This is because React will unmount everything
         * when you change to a different tab since they're all rendered inside
         * different `Tabs.Panel` if you were to use it as Mantine suggests.
         */}
        <Tabs.Panel value={activeTab}>
          {activeTab === EMBED_MODAL_TABS.Overview ? (
            <OverviewSettings
              resourceType={resourceType}
              selectedServerCodeOption={selectedServerCodeOption}
              serverEmbedCodeSlot={getServerEmbedCodePane(
                EMBED_MODAL_TABS.Overview,
              )}
              onClientCodeCopy={language =>
                handleCodeCopy({ code: "view", variant: "overview", language })
              }
            />
          ) : activeTab === EMBED_MODAL_TABS.Parameters ? (
            <SettingsTabLayout
              settingsSlot={
                <ParametersSettings
                  resourceType={resourceType}
                  resourceParameters={resourceParameters}
                  embeddingParams={embeddingParams}
                  lockedParameters={lockedParameters}
                  parameterValues={parameterValues}
                  onChangeEmbeddingParameters={setEmbeddingParams}
                  onChangeParameterValue={(id: string, value: string) =>
                    setParameterValues(state => ({
                      ...state,
                      [id]: value,
                    }))
                  }
                />
              }
              previewSlot={
                <>
                  <PreviewModeSelector
                    value={activePane}
                    onChange={setActivePane}
                  />
                  <PreviewPane
                    hidden={activePane !== "preview"}
                    className="flex-full"
                    previewUrl={iframeUrl}
                    isTransparent={displayOptions.theme === "transparent"}
                  />
                  {activePane === "code"
                    ? getServerEmbedCodePane(EMBED_MODAL_TABS.Parameters)
                    : null}
                </>
              }
            />
          ) : activeTab === EMBED_MODAL_TABS.Appearance ? (
            <SettingsTabLayout
              settingsSlot={
                <AppearanceSettings
                  resourceType={resourceType}
                  displayOptions={displayOptions}
                  onChangeDisplayOptions={setDisplayOptions}
                />
              }
              previewSlot={
                <>
                  <PreviewModeSelector
                    value={activePane}
                    onChange={setActivePane}
                  />
                  <PreviewPane
                    hidden={activePane !== "preview"}
                    className="flex-full"
                    previewUrl={iframeUrl}
                    isTransparent={displayOptions.theme === "transparent"}
                  />
                  {activePane === "code"
                    ? getServerEmbedCodePane(EMBED_MODAL_TABS.Appearance)
                    : null}
                </>
              }
            />
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

function getDefaultEmbeddingParams(
  resource: EmbedResource,
  resourceParameters: EmbedResourceParameter[],
): EmbeddingParametersSettings {
  return filterValidResourceParameters(
    resourceParameters,
    resource.embedding_params || {},
  );
}

function filterValidResourceParameters(
  resourceParameters: EmbedResourceParameter[],
  embeddingParams: EmbeddingParametersSettings,
) {
  const validParameters = resourceParameters.map(parameter => parameter.slug);

  return _.pick(embeddingParams, validParameters);
}

function getPreviewParamsBySlug({
  resourceParameters,
  embeddingParams,
  parameterValues,
}: {
  resourceParameters: EmbedResourceParameter[];
  embeddingParams: EmbeddingParametersSettings;
  parameterValues: EmbeddingParametersValues;
}) {
  const lockedParameters = getLockedPreviewParameters(
    resourceParameters,
    embeddingParams,
  );

  return Object.fromEntries(
    lockedParameters.map(parameter => [
      parameter.slug,
      parameterValues[parameter.id] ?? null,
    ]),
  );
}

function getLockedPreviewParameters(
  resourceParameters: EmbedResourceParameter[],
  embeddingParams: EmbeddingParametersSettings,
) {
  return resourceParameters.filter(
    parameter => embeddingParams[parameter.slug] === "locked",
  );
}

function getHasSettingsChanges({
  initialEmbeddingParams,
  embeddingParams,
}: {
  initialEmbeddingParams: EmbeddingParametersSettings;
  embeddingParams: EmbeddingParametersSettings;
}): boolean {
  const nonDisabledInitialEmbeddingParams = getNonDisabledEmbeddingParams(
    initialEmbeddingParams,
  );
  const nonDisabledEmbeddingParams =
    getNonDisabledEmbeddingParams(embeddingParams);

  return !_.isEqual(
    nonDisabledInitialEmbeddingParams,
    nonDisabledEmbeddingParams,
  );
}

function getNonDisabledEmbeddingParams(
  embeddingParams: EmbeddingParametersSettings,
): EmbeddingParametersSettings {
  return Object.keys(embeddingParams).reduce((result, key) => {
    if (embeddingParams[key] !== "disabled") {
      result[key] = embeddingParams[key];
    }

    return result;
  }, {} as EmbeddingParametersSettings);
}

function convertResourceParametersToEmbeddingParams(
  resourceParameters: EmbedResourceParameter[],
) {
  const embeddingParams: EmbeddingParametersSettings = {};
  for (const parameter of resourceParameters) {
    embeddingParams[parameter.slug] = "disabled";
  }

  return embeddingParams;
}
