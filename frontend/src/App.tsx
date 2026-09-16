import AppRouter from '@/router/AppRouter'
import { AuthProvider } from '@/auth/AuthContext'
import { PetProvider } from '@/features/pet/context/PetContext'
import { CharacterProvider } from '@/features/character'
import { EnvironmentProvider } from '@/features/environment'

function App() {
    return (
        <AuthProvider>
            {/* EnvironmentProvider is fully independent of CharacterProvider —
          neither engine imports the other, so nesting order here is not
          load-bearing (see features/environment/react/useMochiEnvironmentBridge.ts
          for the one place they're ever composed together). */}
            <EnvironmentProvider>
                {/* CharacterProvider sits outside PetProvider: the pet's data
            layer drives the character through the engine's semantic API,
            so the engine must already exist when PetProvider mounts. */}
                <CharacterProvider>
                    <PetProvider>
                        <AppRouter />
                    </PetProvider>
                </CharacterProvider>
            </EnvironmentProvider>
        </AuthProvider>
    )
}

export default App