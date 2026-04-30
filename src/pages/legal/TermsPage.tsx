import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Terms and Conditions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                By accessing and using MetaMindful ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                MetaMindful is an AI-powered mental wellness chatbot designed to provide support, guidance, and information related to mental health and wellness. The Service is intended for informational and support purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                3. Not a Substitute for Professional Care
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                <strong className="text-gray-900 dark:text-gray-100">IMPORTANT:</strong> MetaMindful is not a licensed healthcare provider and does not provide medical, psychological, or therapeutic advice. Our chatbot is designed to offer general support and information. If you are experiencing a mental health emergency or crisis, please contact:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Your local emergency services (911 in the US)</li>
                <li>A licensed mental health professional</li>
                <li>A crisis hotline (e.g., National Suicide Prevention Lifeline: 988)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                4. User Responsibilities
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Provide accurate and truthful information when using the Service</li>
                <li>Use the Service in a lawful manner and in accordance with these Terms</li>
                <li>Not attempt to harm, interfere with, or disrupt the Service</li>
                <li>Not use the Service for any illegal or unauthorized purpose</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Seek professional help when appropriate and not rely solely on the chatbot for critical mental health decisions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                5. Intellectual Property
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                All content, features, and functionality of the Service, including but not limited to text, graphics, logos, and software, are the exclusive property of MetaMindful and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                6. User Content
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                By using the Service, you retain ownership of any messages or content you submit. However, you grant us a non-exclusive, royalty-free, worldwide license to use, store, and process your content solely for the purpose of providing and improving the Service, in accordance with our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                7. Confidential Information and Data Security
              </h2>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  7.1. Definition of Confidential Information
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  The term "Confidential Information" includes all information related to the mobile app "MetaMindful", including its source code, design, user interface, functionality, features, and user data disclosed during the beta testing process.
                </p>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  7.2. Obligations of the Receiving Party
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                  <strong className="text-gray-900 dark:text-gray-100">Confidentiality:</strong> You agree to maintain the confidentiality of all Confidential Information.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
                  <strong className="text-gray-900 dark:text-gray-100">Use of Information:</strong> You may use the Confidential Information solely for the purpose of beta testing and providing feedback.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  <strong className="text-gray-900 dark:text-gray-100">Protection of Information:</strong> You must protect the Confidential Information with the same degree of care you use to protect your own confidential information, but in no event less than reasonable care.
                </p>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  7.3. Consequences of Breach
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  If you breach these terms, we may seek legal remedies, including but not limited to injunctive relief, damages, or other remedies available under the laws of the United States of America.
                </p>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  7.4. Privacy and Data Security
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  MetaMindful is committed to protecting your privacy. We encrypt and securely store all user data. With your consent, we use your data to enhance your experience. You have full control over your data, including access and deletion rights, ensuring that your privacy is always protected.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                8. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                To the fullest extent permitted by law, MetaMindful shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Your use or inability to use the Service</li>
                <li>Any content or information provided by the chatbot</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                <li>Any bugs, viruses, or other harmful components</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                9. Disclaimer of Warranties
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free, or that defects will be corrected.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                10. Termination
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We reserve the right to suspend or terminate your access to the Service at any time, with or without cause or notice, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                12. Governing Law
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                These Terms are governed by the laws of the United States of America.
              </p>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                13. Eligibility
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You must be at least 16 years old to use MetaMindful. By accessing or using the Service, you represent and warrant that you meet this age requirement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                14. Contact Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Email: <a href="mailto:info@metamindful.ai" className="text-blue-600 dark:text-blue-400 hover:underline">info@metamindful.ai</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}




