import java.util.Properties

plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose")
}

/*
 * A CHAVE — a parte deste arquivo que não é rotina.
 *
 * O Wearable Data Layer só entrega mensagens entre apps que tenham o MESMO
 * applicationId e a MESMA assinatura. Não é uma recomendação de organização: é
 * como o sistema decide que os dois binários, em dois aparelhos, são o mesmo
 * app. Errar qualquer um dos dois não dá erro — dá silêncio, com os dois lados
 * jurando que não há nada conectado, que é o pior modo de falhar que existe.
 *
 * Por isso o keystore aqui é o MESMO que assina o app do celular, exportado da
 * conta da EAS. Ele mora fora do repositório (`.gitignore` já exclui `*.jks` e
 * este `keystore.properties`), e sem ele o build cai no debug — que compila e
 * instala, mas não conversa com o app de release que está no celular.
 */
val chave = Properties().apply {
  val arquivo = rootProject.file("keystore.properties")
  if (arquivo.exists()) arquivo.inputStream().use { load(it) }
}
val temChave = chave.getProperty("storeFile") != null

android {
  namespace = "com.impeto.app"
  compileSdk = 35

  defaultConfig {
    // Idêntico ao do celular. Ver o comentário acima — isto é o contrato.
    applicationId = "com.impeto.app"
    // Wear OS 3. O aparelho de teste — um Galaxy Watch 7 (SM-L310) — respondeu
    // API 36, ou seja Wear OS 6; nada aqui exige mais que 30, e um piso baixo
    // não custa nada.
    minSdk = 30
    targetSdk = 34
    versionCode = 16
    versionName = "1.5.6"
  }

  signingConfigs {
    if (temChave) {
      create("release") {
        storeFile = rootProject.file(chave.getProperty("storeFile"))
        storePassword = chave.getProperty("storePassword")
        keyAlias = chave.getProperty("keyAlias")
        keyPassword = chave.getProperty("keyPassword")
      }
    }
  }

  buildTypes {
    getByName("release") {
      isMinifyEnabled = false
      if (temChave) signingConfig = signingConfigs.getByName("release")
    }
    getByName("debug") {
      // O debug também assina com a chave de release quando ela existe. Sem
      // isso o app instalado pelo `installDebug` fica mudo diante do celular, e
      // o desenvolvedor perde a tarde procurando bug de rede onde só há
      // assinatura trocada.
      if (temChave) signingConfig = signingConfigs.getByName("release")
    }
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  kotlinOptions { jvmTarget = "17" }

  buildFeatures { compose = true }
}

dependencies {
  implementation("androidx.core:core-ktx:1.15.0")
  implementation("androidx.activity:activity-compose:1.9.3")
  implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
  implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

  implementation(platform("androidx.compose:compose-bom:2024.12.01"))
  implementation("androidx.compose.ui:ui")
  implementation("androidx.compose.ui:ui-tooling-preview")
  debugImplementation("androidx.compose.ui:ui-tooling")

  // Wear Compose, não Compose Material comum: é o que traz `ScalingLazyColumn`
  // (a lista que encolhe nas bordas da tela redonda), `TimeText` e a rolagem
  // pela coroa. Material comum numa tela redonda desperdiça os cantos e ignora
  // a coroa, que é o principal jeito de navegar num relógio.
  implementation("androidx.wear.compose:compose-material:1.4.0")
  implementation("androidx.wear.compose:compose-foundation:1.4.0")

  implementation("com.google.android.gms:play-services-wearable:18.2.0")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")
}
