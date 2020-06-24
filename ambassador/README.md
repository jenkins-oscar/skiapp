# Protect Apps Deployed with Jenkins X using Ambassador

# Overview
Microservice orchestrated by Kubernetes sometimes need not be public facing.  

There are many options to secure an end point, however, in this post we walk through configuring Datawire's Ambassador Gateway to protect an app which has been put through CI/CD and published via Jenkins X.  We enable SSO to leverage existing identitiy management using Azure Active Directory all in AWS and EKS.

# Create EKS Cluster
For this scenario we will use AWS EKS

Create an EKS cluster using `eksctl` using the following command

```bash
eksctl create cluster  \
--name drymartini  \
--full-ecr-access
```

Once the cluster is **Active** you are ready to install Jenkins X.

# Configure Route 53 DNS
Part of our scenario is to configure Jenkins X with a custom domain.  To do this, we must first configure a Route 53 **Managed Zone** then delegate your subdomain to Route 53.  In my case, my domain is managed by Google Domains, and so I’ve created an NS record pointing to the NS servers given to me by Route 53 after I created my Hosted Zone.


1. Create a Managed Zone for subdomain
2. Delegate your subdomain to AWS Route 53 from the vendor hosting your domain.
3. Test it using dig `jx.eks.sharepointoscar.com` (in my case).

**NOTE:** Testing the Hosted Zone can be done from the AWS Console, and ultimately you want a response with NOERROR

# Install Jenkins X using Boot
With the cluster created and DNS configured, we are ready to install Jenkins X using **Jenkins X Boot**

We will be using a stable distribution of the open-source Jenkins X project, otherwise known as CJXD [CloudBees Jenkins X Distribution](https://www.cloudbees.com/products/cloudbees-jenkins-x-distribution/overview).  The advantage of using this edition vs. the straight OSS is that it has been tested, and certified for EKS, it also allows for a controlled platform upgrade within your enterprise environment.

## Install Jenkins X CLI

```bash
# download binary for CJXD (CloudBees Jenkins X Distro) based on your platform.
# https://docs.cloudbees.com/docs/cloudbees-jenkins-x-distribution 
curl -L https://storage.googleapis.com/artifacts.jenkinsxio.appspot.com/binaries/cjxd/latest/jx-darwin-amd64.tar.gz | tar xzv

# move to bin
sudo mv jx /usr/local/bin

# test
➜ jx version
NAME               VERSION
jx                 2.0.1245+cjxd.8
Kubernetes cluster v1.14.10-gke.27
kubectl            v1.15.0
helm client        2.14.3
git                2.21.0
Operating System   Mac OS X 10.14.6 build 18G3020
```
## Execute JX Boot
Our next step is to install Jenkins X on top of the EKS cluster.  We do this by using a declarative `yaml` approach.

During the `curl` of the `jx` binary, a couple of `yaml` files were downloaded to the same directory where we executed that command.

We will use the `jx-requirements-eks.yml` 

### Step 1 - Modify the jx-requirements-eks.yml file with basic settings

The basic settings we will modify in order to execute an initial jx boot installation will be as follows (please modify your file accordingly)

```bash
cluster:
 clusterName: drymartini
 environmentGitOwner: jenkins-oscar #github organization
 environmentGitPublic: true #my org is on free tier, so public repos
 provider: eks
 region: us-west-2

```
Next we modify the main `ingress` field as follows:

```bash
ingress:
 domain: jx.eks.sharepointoscar.com #Route 53 Managed Zone
 externalDNS: true
 ignoreLoadBalancer: true
 namespaceSubDomain: . # personally a dot makes for cleaner FQDN entries
 tls:
   email: me@sharepointoscar.com
   enabled: true
   production: true
```

**HashiCorp Vault Initial Configuration**

In order for the jx boot command to run successfully the first time, we need to specify an IAM username in the specific jx-requirements-eks.yml file section as follows:


```bash
vault:
 aws:
   autoCreate: true
   iamUserName: aws_admin@sharepointoscar.com #IAM Username
 disableURLDiscovery: true

```
For details on IAM permissions, please refer to the [documentation](https://docs.cloudbees.com/docs/cloudbees-jenkins-x-distribution/latest/eks-install-guide/aws-iam-permissions).


### Step 2 - Execute JX Boot CLI Command
Having modified the appropriate fields in the jx-requirements-eks.yml, we are ready to execute the jx boot CLI command as follows:

```bash
$ jx boot -r jx-requirements.eks.yml
```
The CLI will ask a few questions.

The cluster configuration repository is cloned immediately.  This repository will be added to your GitHub Organization, and any future changes will require a Pull Request, the GitOps way!

**IMPORTANT:** Any future executions of jx boot, will require you to execute it from the root of the [cluster configuration repository](https://github.com/cloudbees/cloudbees-jenkins-x-boot-config.git) that was cloned during the first run.  This effectively means the original jx-requirements-eks.yml file is no longer used in subsequent executions.



# Setup Ambasador Edge Stack

To setup Ambassador, you can follow the simple instructions on their wonderful [Docs site](https://www.getambassador.io/docs/latest/topics/install/).


 #### Install from MacOS
Download it with a curl command:

```bash
sudo curl -fL https://metriton.datawire.io/downloads/darwin/edgectl -o /usr/local/bin/edgectl && sudo chmod a+x /usr/local/bin/edgectl
```

The installer will provision a load balancer, configure TLS, and provide you with an edgestack.me subdomain. The edgestack.me subdomain allows the Ambassador Edge Stack to automatically provision TLS and HTTPS for a domain name, so you can get started right away.

Once you have it configured, you are ready to move to next step.


### Create AD App Registration
Setup Azure App Registration link goes here.

### Configure Filter

```yaml 
apiVersion: getambassador.io/v2
kind: Filter
metadata:
  name: azure-skiapp-ad
  namespace: jx-staging
spec:
  OAuth2:
    authorizationURL: https://login.microsoftonline.com/<AD_TENANT_ID>/v2.0  ## URL where Ambassador Edge Stack can find OAuth2 descriptor
    clientID: <APP_CLIENT_ID> ## OAuth2 client from your IdP
    secret: <APP_SECRET> ## Secret used to access OAuth2 client
    protectedOrigins:
    - origin: https://skiapp.dev.sharepointoscar.com

```
### Configure Filter Policy

```yaml
apiVersion: getambassador.io/v2
kind: FilterPolicy
metadata:
  name: azure-skiapp-policy
  namespace: jx-staging
spec:
  rules:
      # Requires authentication on requests from hostname
    - host: "skiapp.dev.sharepointoscar.com"
      path: "*"
      filters:
        - name: azure-skiapp-ad
```

# Import App Into Jenkins X
Import app from GitHub as follows.

```bash
jx import --url <GITHUB_REPO_URL>
```

## Modify App Ingress Config
When you import an application into Jenkins X, it automatically creates a Helm Chart!  In this step, we need to modify the Helm Chart to tell Jenkins X, it should not use `exposecontroller` component to expose the app, which it did automatically.

## Modify the Helm Chart
Under the `helm/myapp` chart, you will find a file called `values.yaml` which we need to modify as follows.

Original `Service` configuration.

```yaml
service:
  name: skiapp
  type: ClusterIP
  externalPort: 80
  internalPort: 8080
  annotations:
    fabric8.io/expose: "true"
    fabric8.io/ingress.annotations: "kubernetes.io/ingress.class: nginx"
```

Modified `Service`

```yaml
service:
  name: skiapp
  type: ClusterIP
  externalPort: 80
  internalPort: 8080
  annotations:
    getambassador.io/config: |
        ---
        apiVersion: ambassador/v1
        kind: Mapping
        name: skiapp-service_mapping
        host: skiapp.dev.sharepointoscar.com
        prefix: /
        service: skiapp:80
```

# Summary
We now have an app which was put through CI/CD using Jenkins X - protected using Ambassador, and using SSO backed by Azure Active Directory.  You can use Okta or any other IdP you environment uses, as long as it is using OAuth2 in this case.

