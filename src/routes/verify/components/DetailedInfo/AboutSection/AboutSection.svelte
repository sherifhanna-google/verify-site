<!--
  Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors
-->
<script lang="ts">
  import CollapsibleSection from '$src/components/SidebarSection/CollapsibleSection.svelte';
  import type { ManifestData } from '$src/lib/asset';
  import { _ } from 'svelte-i18n';
  import IssuedBySection from './IssuedBySection.svelte';
  import IssuedOnSection from './IssuedOnSection.svelte';
  import SocialMediaInfo from '$src/components/SocialMediaInfo/SocialMediaInfo.svelte';

  export let manifestData: ManifestData;
  export let trustSource: 'official' | 'legacy' | 'none' = 'none';

  // Extract extended X.509 fields (Catching various Rust/JS SDK naming conventions)
  $: sigInfo = manifestData.signatureInfo as Record<string, unknown> | undefined;
  $: orgUnit = (sigInfo?.organization_unit || sigInfo?.organizational_unit || sigInfo?.organizationUnit || sigInfo?.org_unit || sigInfo?.ou || undefined) as string | undefined;
  $: country = (sigInfo?.country || sigInfo?.country_name || sigInfo?.countryName || sigInfo?.c || undefined) as string | undefined;
</script>

{#if manifestData.signatureInfo?.common_name || manifestData.signatureInfo?.issuer || manifestData.date || (manifestData.socialAccounts && manifestData.socialAccounts.length > 0)}
  <CollapsibleSection>
    <svelte:fragment slot="header">
      {$_('sidebar.verify.about')}</svelte:fragment>
    <svelte:fragment slot="content">
      {#if manifestData.signatureInfo?.common_name || manifestData.signatureInfo?.issuer}
        <IssuedBySection 
          commonName={manifestData.signatureInfo?.common_name || undefined} 
          issuer={manifestData.signatureInfo?.issuer || undefined}
          organizationalUnit={orgUnit}
          {country}
          {trustSource} 
        />
      {/if}

      {#if manifestData.date}
        <IssuedOnSection date={manifestData.date} />
      {/if}

      {#if manifestData.socialAccounts && manifestData.socialAccounts.length > 0}
        <div class="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-3" data-testid="social-accounts-section">
          {#each manifestData.socialAccounts as account}
            <SocialMediaInfo
              link={account['@id']}
              username={account.name}
              appName={account.identifier}
            />
          {/each}
        </div>
      {/if}
    </svelte:fragment>
  </CollapsibleSection>
{/if}
