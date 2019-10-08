# Overview 

This is a simple NodeJS application that uses Bootstrap UI. It listens on localhost:8080.  

# Reset after demo

```bash
it checkout orig

git merge -s ours master --no-edit

git checkout master

git merge orig

rm -rf charts

git push

```

# Import Project

```bash
jx import

# watch activities
jx get activities --filter go-demo-6 --watch # Stop with *ctrl*c*

# check kubernetes resources status
kubectl --namespace jx-staging logs -l app=skiapp
```