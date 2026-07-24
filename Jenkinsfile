#!/usr/bin/env groovy
library 'status-jenkins-lib@v1.8.8'

pipeline {
  agent {
    docker {
      label 'linuxcontainer'
      image 'harbor.status.im/infra/ci-build-containers:linux-base-1.0.0'
      args '--volume=/nix:/nix ' +
           '--volume=/etc/nix:/etc/nix ' +
           '--user jenkins'
    }
  }

  options {
    disableRestartFromStage()
    disableConcurrentBuilds()
    /* manage how many builds we keep */
    buildDiscarder(logRotator(
      numToKeepStr: '20',
      daysToKeepStr: '30',
    ))
  }

  environment {
    GIT_COMMITTER_NAME = 'status-im-auto'
    GIT_COMMITTER_EMAIL = 'auto@status.im'
  }

  stages {
    stage('Install') {
      steps {
        script {
          nix.develop('npm ci', pure: false)
        }
      }
    }

    stage('Build') {
      steps {
        script {
          nix.develop('npm run build', pure: false)
          jenkins.genBuildMetaJSON('build/build.json')
        }
      }
    }

    stage('Publish') {
      steps {
        sshagent(credentials: ['status-im-auto-ssh']) {
          script {
            nix.develop("""
              ghp-import \
                -b ${deployBranch()} \
                -c ${deployDomain()} \
                -p build
            """, pure: false)
          }
        }
      }
    }
  }

  post {
    cleanup { cleanWs() }
  }
}

def isMainBranch() { GIT_BRANCH ==~ /.*main/ }
def deployBranch() { isMainBranch() ? 'deploy-master' : 'deploy-develop' }
def deployDomain() { isMainBranch() ? 'docs.logos.co' : 'dev-docs.logos.co' }
