<!--
Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors
-->

<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { SidebarLayout } from '$src/features/SidebarLayout';
  import { onMount, type SvelteComponent } from 'svelte';
  import { _ } from 'svelte-i18n';
  import type { ComponentType } from 'svelte';

  let LazyTreeView: ComponentType | undefined;
  let LazyCompareView: ComponentType | undefined;
  let LazyDetailedInfo: ComponentType | undefined;
  let LazyComparePanel: ComponentType | undefined;
  let LazyCompareDetailedInfo: ComponentType | undefined;

  $: if ($hierarchyView.state === 'success' && !LazyTreeView) {
    import('./verify/components/TreeView/TreeView.svelte').then((m) => (LazyTreeView = m.default));
    import('./verify/components/DetailedInfo/DetailedInfo.svelte').then((m) => (LazyDetailedInfo = m.default));
  }

  $: if ($compareView.state === 'success' && !LazyCompareView) {
    import('./verify/components/Compare/CompareView/CompareView.svelte').then((m) => (LazyCompareView = m.default));
    import('./verify/components/Compare/ComparePanel/ComparePanel.svelte').then((m) => (LazyComparePanel = m.default));
    import('./verify/components/Compare/CompareInfo/CompareInfo.svelte').then((m) => (LazyCompareDetailedInfo = m.default));
  }
  import DragDropOverlay from './verify/components/DragDropOverlay/DragDropOverlay.svelte';
  import EmptyState from './verify/components/EmptyState/EmptyState.svelte';
  import FilePicker from './verify/components/FilePicker/FilePicker.svelte';
  import LoadingOverlay from './verify/components/LoadingOverlay/LoadingOverlay.svelte';
  import NavigationPanel from './verify/components/NavigationPanel/NavigationPanel.svelte';
  import RevealablePanel from './verify/components/RevealablePanel/RevealablePanel.svelte';
  
  import {
    dragDropAction,
    type DragDropActionParams,
  } from './verify/lib/dragDrop';
  import { verifyStore } from './verify/stores';

  let showDropOverlay = false;
  let showPanel = false;
  let filePicker: SvelteComponent<{ launch?: () => void }>;
  let rightPanel: SvelteComponent<{
    getElement?: () => HTMLDivElement | undefined;
  }>;
  let isSidebarScrolled = false;
  const { hierarchyView, compareView, viewState } = verifyStore;
  // Number of pixels to scroll for shadow to be shown
  const sidebarScrollThreshold = 10;

  const dragDropParams: DragDropActionParams = {
    onDragStateChange(newState: boolean) {
      showDropOverlay = newState;
    },
  };

  $: hasEmptyState = $hierarchyView.state === 'none';
  $: showLoadingOverlay = $hierarchyView.state === 'loading';

  // Check for `source` parameter and load that asset if it exists
  afterNavigate((nav: import('@sveltejs/kit').AfterNavigate) => {
    const { searchParams } = nav.to?.url ?? {};
    const source = searchParams?.get('source');

    if (!source) return;

    try {
      const sourceUrl = new URL(source);
      verifyStore.readC2paSource(sourceUrl.toString());
    } catch (err) {
      // Invalid source passed, ignore
      return;
    }
  });

  function handleLaunchFilePicker() {
    return () => {
      filePicker?.launch();
    };
  }

  function handleSidebarScroll(evt: CustomEvent<{ scrollTop: number }>) {
    isSidebarScrolled = evt.detail.scrollTop > sidebarScrollThreshold;
  }

  onMount(() => {
    // Run cleanup when this component is unmounted (e.g. on navigating away)
    return () => {
      verifyStore.clear();
    };
  });
</script>

<div
  use:dragDropAction={dragDropParams}
  aria-busy={showLoadingOverlay ? 'true' : 'false'}
  data-testid="file-dropzone">
  <DragDropOverlay visible={showDropOverlay} />
  <LoadingOverlay visible={showLoadingOverlay} />
  <FilePicker bind:this={filePicker} />
  <SidebarLayout
    leftColumnTakeover={hasEmptyState}
    on:sidebarScroll={handleSidebarScroll}
    showHeader={$viewState !== 'compare'}>
    <!-- Left panel -->
    <svelte:fragment slot="sidebar">
      {#if $viewState === 'hierarchy'}
        {#if hasEmptyState}
          <EmptyState on:launchFilePicker={handleLaunchFilePicker()} />
        {:else}
          <NavigationPanel
            on:launchFilePicker={handleLaunchFilePicker()}
            isScrolled={isSidebarScrolled} />
        {/if}
      {:else if $viewState === 'compare' && $compareView.state === 'success' && LazyComparePanel}
        <svelte:component this={LazyComparePanel} assetStoreMap={$compareView.compareAssetMap} />
      {/if}
    </svelte:fragment>
    <!-- Content (main 2/3rds) -->
    <div
      slot="content"
      class="h-full grid-cols-[auto_theme(spacing.sidebar)] bg-gray-40 sm:grid">
      <!-- Center panel -->
      <div class="h-full lg:h-screen">
        {#if $viewState === 'hierarchy' && $hierarchyView.state === 'success' && LazyTreeView}
          <svelte:component this={LazyTreeView}
            assetStoreMap={$hierarchyView.assets}
            selectedAsset={$hierarchyView.selectedAssetStore}
            on:mobileTap={() => (showPanel = true)} />
        {:else if $viewState === 'compare' && $compareView.state === 'success' && LazyCompareView}
          <svelte:component this={LazyCompareView} selectedAssets={$compareView.selectedAssets} />
        {/if}
      </div>
      <!-- Right panel -->
      <RevealablePanel {showPanel} bind:this={rightPanel}>
        {#if $viewState === 'hierarchy' && $hierarchyView.state === 'success' && $hierarchyView.selectedAssetStore && LazyDetailedInfo}
          <svelte:component this={LazyDetailedInfo}
            on:close={() => (showPanel = false)}
            assetData={$hierarchyView.selectedAssetStore}
            viewportElement={rightPanel?.getElement()} />
        {:else if $viewState === 'compare' && $compareView.state === 'success' && $compareView.activeAssetData && LazyCompareDetailedInfo}
          <svelte:component this={LazyCompareDetailedInfo}
            on:close={() => (showPanel = false)}
            assetData={$compareView.activeAssetData} />
        {/if}
      </RevealablePanel>
    </div>
    <svelte:fragment slot="back-bar">{$_('page.home.title')}</svelte:fragment>
  </SidebarLayout>
</div>
