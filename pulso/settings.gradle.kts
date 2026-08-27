/*
 * O app do relógio é um projeto Gradle SEPARADO, e isso não é organização — é
 * necessidade.
 *
 * O app do celular é Expo managed: `android/` está no .gitignore e o `prebuild`
 * a regenera do zero a cada build. Um módulo `:pulso` lá dentro seria apagado
 * na próxima compilação, toda vez. Aqui ele é dono do próprio ciclo, compila
 * com `./gradlew` comum, e não sabe que o Expo existe.
 *
 * O que os dois PRECISAM compartilhar é outra coisa, e está em app/build.gradle.kts:
 * o mesmo applicationId e a mesma chave de assinatura. Sem isso o Data Layer
 * não roteia nada entre eles.
 */
pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "pulso"
include(":app")
