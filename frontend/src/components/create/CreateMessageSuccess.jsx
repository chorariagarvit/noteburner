
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Check, Users, Copy, Flame, UserPlus } from 'lucide-react';
import { QRCodeDisplay } from '../QRCodeDisplay';
import { GroupMessageLinks } from '../GroupMessageLinks';
import InviteModal from '../InviteModal';
import AchievementUnlocked from '../AchievementUnlocked';
import RewardUnlocked from '../RewardUnlocked';

function CreateMessageSuccess({
    shareUrl,
    groupData,
    password,
    expiresIn,
    filesCount,
    onReset,
    onCreateSimilar,
    newAchievements,
    setNewAchievements,
    newRewards,
    setNewRewards
}) {
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="card animate-fade-in">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 mb-4">
                            {groupData ? <Users className="w-8 h-8" /> : <Check className="w-8 h-8" />}
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            {groupData ? 'Group Message Created!' : 'Message Created Successfully!'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            {groupData
                                ? `${groupData.recipientCount} unique links generated for your recipients`
                                : 'Your encrypted message is ready to share'
                            }
                        </p>
                    </div>

                    {groupData ? (
                        /* Group Message Links Display */
                        <GroupMessageLinks groupData={groupData} />
                    ) : (
                        /* Regular Single Message Display */
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="share-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Share this URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="share-url"
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="input-field font-mono text-sm"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h3 className="font-semibold text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-2">
                                    <Flame className="w-5 h-5" />
                                    Important Security Notice
                                </h3>
                                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                                    <li>• Share the password separately (not in the same channel as the link)</li>
                                    <li>• The message will be deleted after the first successful decryption</li>
                                    <li>• There are no backups - once it's gone, it's gone forever</li>
                                    {filesCount > 0 && <li>• {filesCount} encrypted file(s) attached</li>}
                                    {expiresIn && <li>• Message expires in {expiresIn} hour(s)</li>}
                                </ul>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Password</h3>
                                <div className="font-mono text-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600">
                                    {password}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Make sure the recipient has this password before sharing the link
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Share via QR Code</h3>
                                <QRCodeDisplay url={shareUrl} size={256} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={onReset}
                                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                                >
                                    <Flame className="w-4 h-4" />
                                    Create New Message
                                </button>
                                <button
                                    onClick={onCreateSimilar}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Create Similar Message
                                </button>
                            </div>

                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="btn-secondary w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                                <UserPlus className="w-4 h-4" />
                                Invite Friends to NoteBurner
                            </button>

                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                                💡 &quot;Similar&quot; keeps your settings but clears the message
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Achievement unlock popup */}
            {newAchievements.map((achievement, index) => {
                const handleCloseAchievement = () => {
                    setNewAchievements(prev => prev.filter((_, i) => i !== index));
                };

                return (
                    <AchievementUnlocked
                        key={achievement.id}
                        achievement={achievement}
                        onClose={handleCloseAchievement}
                    />
                );
            })}

            {/* Reward unlock popup */}
            {newRewards.map((reward, index) => {
                const handleCloseReward = () => {
                    setNewRewards(prev => prev.filter((_, i) => i !== index));
                };

                return (
                    <RewardUnlocked
                        key={reward.reward}
                        reward={reward}
                        onClose={handleCloseReward}
                    />
                );
            })}

            {/* Invite Friends Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                shareUrl={shareUrl}
                messagePreview="I just created a secure message using NoteBurner"
            />
        </div>
    );
}

CreateMessageSuccess.propTypes = {
    shareUrl: PropTypes.string,
    groupData: PropTypes.object,
    password: PropTypes.string.isRequired,
    expiresIn: PropTypes.string,
    filesCount: PropTypes.number,
    onReset: PropTypes.func.isRequired,
    onCreateSimilar: PropTypes.func.isRequired,
    newAchievements: PropTypes.array,
    setNewAchievements: PropTypes.func,
    newRewards: PropTypes.array,
    setNewRewards: PropTypes.func,
};

CreateMessageSuccess.defaultProps = {
    expiresIn: '24',
    filesCount: 0,
    newAchievements: [],
    setNewAchievements: () => { },
    newRewards: [],
    setNewRewards: () => { },
};

export default CreateMessageSuccess;
