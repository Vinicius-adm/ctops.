import { ClientSecretCredential } from "@azure/identity";
import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { ContainerAppsAPIClient } from "@azure/arm-appcontainers";

function getAzureCredential() {
  const tenantId = process.env.AZURE_TENANT_ID || "";
  const clientId = process.env.AZURE_CLIENT_ID || "";
  const clientSecret = process.env.AZURE_CLIENT_SECRET || "";

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Azure credentials missing. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET."
    );
  }

  return new ClientSecretCredential(tenantId, clientId, clientSecret);
}

export async function inspectAciContainerGroup(params: {
  subscriptionId: string;
  resourceGroup: string;
  containerGroupName: string;
}) {
  const cred = getAzureCredential();
  const client = new ContainerInstanceManagementClient(cred, params.subscriptionId);
  return client.containerGroups.get(params.resourceGroup, params.containerGroupName);
}

export async function restartAciContainerGroup(params: {
  subscriptionId: string;
  resourceGroup: string;
  containerGroupName: string;
}) {
  const cred = getAzureCredential();
  const client = new ContainerInstanceManagementClient(cred, params.subscriptionId);
  await client.containerGroups.beginRestartAndWait(
    params.resourceGroup,
    params.containerGroupName
  );
}

export async function getAciContainerLogs(params: {
  subscriptionId: string;
  resourceGroup: string;
  containerGroupName: string;
  containerName: string;
  tail?: number;
}) {
  const cred = getAzureCredential();
  const client = new ContainerInstanceManagementClient(cred, params.subscriptionId);

  // ARM retorna { content: string }
  const resp = await client.containers.listLogs(
    params.resourceGroup,
    params.containerGroupName,
    params.containerName,
    { tail: params.tail ?? 200 }
  );

  return resp?.content || "";
}

export async function restartContainerAppsRevision(params: {
  subscriptionId: string;
  resourceGroup: string;
  containerAppName: string;
  revisionName: string;
}) {
  const cred = getAzureCredential();
  const client = new ContainerAppsAPIClient(cred, params.subscriptionId);

  await client.containerAppsRevisions.restartRevision(
    params.resourceGroup,
    params.containerAppName,
    params.revisionName
  );
}

export async function inspectContainerAppsRevision(params: {
  subscriptionId: string;
  resourceGroup: string;
  containerAppName: string;
  revisionName: string;
}) {
  const cred = getAzureCredential();
  const client = new ContainerAppsAPIClient(cred, params.subscriptionId);

  return client.containerAppsRevisions.getRevision(
    params.resourceGroup,
    params.containerAppName,
    params.revisionName
  );
}
