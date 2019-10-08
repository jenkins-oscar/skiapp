# Overview 

![Skiapp](skiapp_home.png)
This is a simple NodeJS application that uses Bootstrap UI. It listens on localhost:8080 and it is for ski fans :)


# Reset after demo

```bash
git checkout orig

git merge -s ours master --no-edit

git checkout master

git merge orig

rm -rf charts && rm jenkins-x.yml && rm skaffold.yaml

git push

```

# Import Project

```bash
jx import

# watch activities
jx get activities --filter skiapp --watch # Stop with *ctrl*c*

# check kubernetes resources status
kubectl --namespace jx-staging logs -l app=skiapp
```