# Protect Apps Deployed with Jenkins X using Ambassador


## Setup Ambasador

### Create AD App Registration

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

# Modify App Ingress Config
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

