import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function PrivacyPolicyPage() {
  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900 py-12 px-4">
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
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Introduction
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Welcome to MetaMindful. Your mental well-being is our priority, and that starts with the absolute privacy of your thoughts. This policy describes our data practices for the MetaMindful platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Account and Data Deletion
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You can delete your MetaMindful account at any time from within the app.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                When your account is deleted, your account and the identifying connection to your saved conversations and Threads are removed. Your previous conversations will no longer be accessible to you, associated with your account, or restored if you create a new MetaMindful account later.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Conversation data may remain only after it has been anonymized as described in the Data Storage and Retention section.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You can also request account deletion by visiting <a href="https://metamindful.ai/delete-account/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://metamindful.ai/delete-account/</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Collection
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We only collect data required to use the app:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li><strong>Account Info:</strong> Your email and name for account management.</li>
                <li><strong>Coaching Threads:</strong> The text you share within "Threads" so the AI Coach can provide context-aware guidance.</li>
                <li><strong>No Hidden Data:</strong> We do not access your contacts, location, or camera without explicit, one-time permission for a specific feature.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Usage
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We have the <strong>"No training" Promise.</strong>
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Your data is used solely to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Power your 90-second coaching interactions.</li>
                <li>Track your personal skill-building progress within your private Threads.</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                <strong>Zero Training:</strong> We never use your personal conversations or thread data to train our AI models or any third-party models. Your specific experiences remain yours alone.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Sharing
              </h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li><strong>No Selling:</strong> We never sell, rent, or monetize your data.</li>
                <li><strong>No Marketing:</strong> Your data is never shared with third parties for advertising purposes.</li>
                <li><strong>Third-Party Processing:</strong> We use secure, encrypted, and HIPAA-compliant infrastructure providers to run the AI, but they never use your data for their own purposes.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Storage and Retention
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We retain your account information, saved conversations, Threads, and related data while your MetaMindful account is active so you can return to your previous conversations and continue your progress.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                When you delete your MetaMindful account, your account and the identifying connection between you and your conversation history are removed. Your previous conversations will no longer be accessible through your account, associated with your account, or restored if you create a new MetaMindful account later.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Conversation data may be retained only after it has been anonymized so that it is no longer associated with an identifiable MetaMindful account. Anonymized conversation data may be retained indefinitely for aggregate analytics, safety, and service improvement.
              </p>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                We use appropriate technical and organizational safeguards to protect information handled by MetaMindful, including encryption in transit and at rest where applicable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                User Rights
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                You own your data. You can:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Inquire about how your data is used.</li>
                <li>Request a copy of your data.</li>
                <li>Delete your data instantly via the in-app profile settings.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Apple App Store Provisions
              </h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
                <li>Our data practices comply with Apple's guidelines for data collection and usage.</li>
                <li>We abide by Apple's tracking transparency requirements, ensuring no data is used for unauthorized tracking purposes.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Changes to Privacy Policy
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                In case of updates to our Privacy Policy, they will be reflected on this page. Significant changes will be communicated to users via the app.
              </p>
            </section>



            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Children’s Use
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                MetaMindful is not intended for users under the age of 16. We do not knowingly collect personal information from individuals under 16. If we become aware that such data has been provided, we will take steps to delete it.
              </p>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Contact
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                For any inquiries, questions or concerns, please contact us at:
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

